"""
Emotional Therapist AI — FastAPI Backend
=========================================
Loads:
  • DistilBERT emotion classifier  (distilbert_emotion_model/)
  • Qwen2-1.5B-Instruct generator  (qwen_generator_model/)

Exposes:
  POST /api/chat          — { "message": str, "history": [...] } → { "reply", "emotion", "emoji" }
  GET  /api/chat/stream   — SSE streaming version of /api/chat
  GET  /api/health        — { "status": "ok" }
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import threading
import torch
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from transformers import (
    DistilBertTokenizerFast,
    DistilBertForSequenceClassification,
    AutoTokenizer,
    AutoModelForCausalLM,
    TextIteratorStreamer,
)

from label_map import ID_TO_EMOTION, EMOTION_EMOJI

# ── Model paths ────────────────────────────────────────────────────────────────
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
MODEL_DIR = BACKEND_DIR / "models"

DISTILBERT_PATH = MODEL_DIR / "distilbert_emotion_model"
QWEN_PATH       = MODEL_DIR / "qwen_generator_model"

if not DISTILBERT_PATH.exists():
    DISTILBERT_PATH = PROJECT_ROOT / "distilbert_emotion_model"
if not QWEN_PATH.exists():
    QWEN_PATH = PROJECT_ROOT / "qwen_generator_model"

# ── Device ────────────────────────────────────────────────────────────────────
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[INFO] Using device: {DEVICE}")

# ── Globals (loaded at startup) ───────────────────────────────────────────────
clf_tokenizer: DistilBertTokenizerFast | None = None
clf_model: DistilBertForSequenceClassification | None = None
gen_tokenizer: AutoTokenizer | None = None
gen_model: AutoModelForCausalLM | None = None
models_loaded: bool = False


# ── Therapist system prompt ───────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are MindEase, a compassionate and professional emotional therapist AI. "
    "Your role is to listen actively, validate feelings, and respond with empathy, "
    "warmth, and gentle guidance. Keep responses natural, concise (2-4 sentences), "
    "and conversational. Never give medical diagnoses. "
    "Reflect the user's emotion back to them and offer support."
)


# ── Background model loader ───────────────────────────────────────────────────
def load_models_sync():
    global clf_tokenizer, clf_model, gen_tokenizer, gen_model, models_loaded
    if models_loaded:
        return
    try:
        print("[INFO] Loading DistilBERT emotion classifier (Background)...")
        clf_tokenizer = DistilBertTokenizerFast.from_pretrained(str(DISTILBERT_PATH))
        clf_model = DistilBertForSequenceClassification.from_pretrained(
            str(DISTILBERT_PATH)
        ).to(DEVICE)
        clf_model.eval()
        print("[INFO] DistilBERT loaded [OK]")

        print("[INFO] Loading Qwen2 response generator (Background)...")
        gen_tokenizer = AutoTokenizer.from_pretrained(
            str(QWEN_PATH), trust_remote_code=True
        )
        gen_model = AutoModelForCausalLM.from_pretrained(
            str(QWEN_PATH),
            dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
            device_map="auto" if DEVICE == "cuda" else None,
            low_cpu_mem_usage=True,
            trust_remote_code=True,
        )
        if DEVICE == "cpu":
            gen_model = gen_model.to(DEVICE)
        gen_model.eval()
        print("[INFO] Qwen2 generator loaded [OK]")
        models_loaded = True
        print("[INFO] All models loaded successfully. Ready for requests.")
    except Exception as e:
        print(f"[ERROR] Failed to load models: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[INFO] Starting server. Models are loading in the background...")
    asyncio.create_task(asyncio.to_thread(load_models_sync))

    yield  # app is running

    print("[INFO] Shutting down — releasing models...")
    global clf_model, gen_model
    if 'clf_model' in globals(): del clf_model
    if 'gen_model' in globals(): del gen_model


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(title="Emotional Therapist API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response schemas ─────────────────────────────────────────────────
class HistoryItem(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    history: list[HistoryItem] = []

class ChatResponse(BaseModel):
    reply: str
    emotion: str
    emoji: str


# ── Inference helpers ──────────────────────────────────────────────────────────
def classify_emotion(text: str) -> tuple[str, str]:
    """
    Run DistilBERT on `text` and return (emotion_name, emoji).
    Input is formatted as 'text [SEP] text' to match training format.
    """
    combined = text + " [SEP] " + text
    enc = clf_tokenizer(
        combined,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=256,
    )
    enc = {k: v.to(DEVICE) for k, v in enc.items()}

    with torch.no_grad():
        logits = clf_model(**enc).logits
        pred_id = logits.argmax().item()

    emotion = ID_TO_EMOTION.get(pred_id, "unknown")
    emoji   = EMOTION_EMOJI.get(emotion, "💬")
    return emotion, emoji


def build_messages(history: list[HistoryItem], user_msg: str, emotion: str) -> list[dict]:
    """
    Build a Qwen chat-template message list.
    We inject the detected emotion only into the latest user turn.
    """
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add prior turns (without emotion tags – they're just raw text)
    for h in history[-6:]:   # keep last 3 exchanges for context
        messages.append({"role": h.role, "content": h.content})

    # Latest user turn with emotion context
    messages.append({
        "role": "user",
        "content": f"[Detected emotion: {emotion}]\nUser says: {user_msg}",
    })
    return messages


def generate_response(messages: list[dict], max_new_tokens: int = 200) -> str:
    """Apply Qwen chat template and generate a therapist reply (non-streaming)."""
    raw_inputs = gen_tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
    )

    device = gen_model.device if hasattr(gen_model, "device") else DEVICE
    if hasattr(raw_inputs, "to"):
        raw_inputs = raw_inputs.to(device)

    if isinstance(raw_inputs, dict) or hasattr(raw_inputs, "items"):
        inputs = {k: v.to(device) for k, v in raw_inputs.items()}
        prompt_length = inputs["input_ids"].shape[-1]
    else:
        inputs = {"input_ids": raw_inputs.to(device)}
        prompt_length = inputs["input_ids"].shape[-1]

    with torch.no_grad():
        output_ids = gen_model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            top_k=50,
            repetition_penalty=1.1,
            pad_token_id=gen_tokenizer.eos_token_id,
        )

    new_ids  = output_ids[:, prompt_length:]
    response = gen_tokenizer.decode(new_ids[0], skip_special_tokens=True).strip()
    response = re.sub(r"^(assistant|user|system)\s*:?\s*", "", response, flags=re.I)
    return response or "I'm here for you. Could you tell me more?"


def generate_response_streaming(messages: list[dict], max_new_tokens: int = 200):
    """
    Generate a therapist reply using TextIteratorStreamer for token-by-token streaming.
    Yields text chunks as they are produced by the model.
    """
    raw_inputs = gen_tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=True,
        return_tensors="pt",
    )

    device = gen_model.device if hasattr(gen_model, "device") else DEVICE
    if hasattr(raw_inputs, "to"):
        raw_inputs = raw_inputs.to(device)

    if isinstance(raw_inputs, dict) or hasattr(raw_inputs, "items"):
        inputs = {k: v.to(device) for k, v in raw_inputs.items()}
    else:
        inputs = {"input_ids": raw_inputs.to(device)}

    # Create the streamer — skip_special_tokens prevents <|im_end|> etc. from leaking out
    streamer = TextIteratorStreamer(
        gen_tokenizer, skip_prompt=True, skip_special_tokens=True
    )

    generation_kwargs = dict(
        **inputs,
        streamer=streamer,
        max_new_tokens=max_new_tokens,
        do_sample=True,
        temperature=0.7,
        top_p=0.9,
        top_k=50,
        repetition_penalty=1.1,
        pad_token_id=gen_tokenizer.eos_token_id,
    )

    # Run generation in a background thread so the event loop isn't blocked
    thread = threading.Thread(target=gen_model.generate, kwargs=generation_kwargs)
    thread.start()

    # Yield tokens as they arrive from the streamer
    for new_text in streamer:
        # Strip stray role tags that occasionally leak
        cleaned = re.sub(r"^(assistant|user|system)\s*:?\s*", "", new_text, flags=re.I)
        if cleaned:
            yield cleaned

    thread.join()


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "device": DEVICE, "models_loaded": models_loaded}


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not models_loaded:
        raise HTTPException(status_code=503, detail="Models are still loading. Please try again in a moment.")

    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        emotion, emoji = classify_emotion(req.message)
        messages       = build_messages(req.history, req.message, emotion)
        reply          = generate_response(messages)
    except Exception as exc:
        import traceback
        err_msg = traceback.format_exc()
        raise HTTPException(status_code=500, detail=err_msg)

    return ChatResponse(reply=reply, emotion=emotion, emoji=emoji)


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    """
    SSE streaming endpoint.
    Sends:
      data: {"type": "meta",  "emotion": "...", "emoji": "..."}
      data: {"type": "token", "text": "..."}
      data: {"type": "done"}
    """
    if not models_loaded:
        raise HTTPException(status_code=503, detail="Models are still loading. Please try again in a moment.")

    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Classify emotion synchronously (fast — DistilBERT is small)
    try:
        emotion, emoji = classify_emotion(req.message)
    except Exception as exc:
        import traceback
        raise HTTPException(status_code=500, detail=traceback.format_exc())

    messages = build_messages(req.history, req.message, emotion)

    async def event_generator():
        # Send emotion metadata first so the frontend can display it immediately
        yield f"data: {json.dumps({'type': 'meta', 'emotion': emotion, 'emoji': emoji})}\n\n"

        # Stream generation tokens from a thread pool
        loop = asyncio.get_event_loop()
        queue: asyncio.Queue[str | None] = asyncio.Queue()

        def producer():
            """Runs in a thread; pushes tokens into the async queue."""
            try:
                for chunk in generate_response_streaming(messages):
                    asyncio.run_coroutine_threadsafe(queue.put(chunk), loop)
            finally:
                asyncio.run_coroutine_threadsafe(queue.put(None), loop)  # sentinel

        thread = threading.Thread(target=producer, daemon=True)
        thread.start()

        # Consume tokens from the queue and yield SSE events
        while True:
            chunk = await queue.get()
            if chunk is None:
                break
            yield f"data: {json.dumps({'type': 'token', 'text': chunk})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # Disable Nginx buffering if proxied
        },
    )
