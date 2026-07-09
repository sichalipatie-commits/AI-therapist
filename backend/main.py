"""
Emotional Therapist AI — FastAPI Backend
=========================================
Loads:
  • DistilBERT emotion classifier  (distilbert_emotion_model/)
  • Qwen2-1.5B-Instruct generator  (qwen_generator_model/)
"""

from __future__ import annotations

import os
import re
import torch
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from database import engine, get_db
import models
import schemas
from auth import verify_password, get_password_hash, create_access_token, SECRET_KEY, ALGORITHM

from transformers import (
    DistilBertTokenizerFast,
    DistilBertForSequenceClassification,
    AutoTokenizer,
    AutoModelForCausalLM,
)
from label_map import ID_TO_EMOTION, EMOTION_EMOJI

# ── Model paths ────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

def _resolve_model_path(env_var: str, default_name: str) -> str:
    """Resolve model path: use env var if set (as absolute path), else fall back to BASE_DIR."""
    raw = os.environ.get(env_var, "")
    if raw:
        p = Path(raw)
        if p.exists():
            return str(p.resolve())
        return raw  # If not a local path, treat as HuggingFace Hub ID
    # fallback: look next to backend folder
    local = BASE_DIR / default_name
    if local.exists():
        return str(local.resolve())
    return default_name  # last resort: treat as HuggingFace Hub ID

DISTILBERT_MODEL_ID = _resolve_model_path("DISTILBERT_MODEL_ID", "distilbert_emotion_model")
QWEN_MODEL_ID       = _resolve_model_path("QWEN_MODEL_ID",       "qwen_generator_model")
print(f"[INFO] DistilBERT path: {DISTILBERT_MODEL_ID}")
print(f"[INFO] Qwen path:       {QWEN_MODEL_ID}")


# ── Device ─────────────────────────────────────────────────────────────────────
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[INFO] Using device: {DEVICE}")

# ── Globals ────────────────────────────────────────────────────────────────────
clf_tokenizer: DistilBertTokenizerFast | None = None
clf_model: DistilBertForSequenceClassification | None = None
gen_tokenizer: AutoTokenizer | None = None
gen_model: AutoModelForCausalLM | None = None

# ── System prompt ──────────────────────────────────────────────────────────────
SYSTEM_PROMPT = (
    "You are MindEase, a compassionate and professional emotional therapist AI. "
    "Your role is to listen actively, validate feelings, and respond with empathy, "
    "warmth, and gentle guidance. Keep responses natural, concise (2-4 sentences), "
    "and conversational. Never give medical diagnoses. "
    "Reflect the user's emotion back to them and offer support."
)

# ── Auth helpers ───────────────────────────────────────────────────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


# ── Lifespan ───────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global clf_tokenizer, clf_model, gen_tokenizer, gen_model

    print("[INFO] Creating database tables...")
    models.Base.metadata.create_all(bind=engine)

    print("[INFO] Loading DistilBERT emotion classifier...")
    clf_tokenizer = DistilBertTokenizerFast.from_pretrained(DISTILBERT_MODEL_ID)
    clf_model = DistilBertForSequenceClassification.from_pretrained(DISTILBERT_MODEL_ID).to(DEVICE)
    clf_model.eval()
    print("[INFO] DistilBERT loaded [OK]")

    print("[INFO] Loading Qwen2 response generator...")
    gen_tokenizer = AutoTokenizer.from_pretrained(QWEN_MODEL_ID, trust_remote_code=True)
    gen_model = AutoModelForCausalLM.from_pretrained(
        QWEN_MODEL_ID,
        dtype=torch.float16 if DEVICE == "cuda" else torch.float32,
        device_map="auto" if DEVICE == "cuda" else None,
        low_cpu_mem_usage=True,
        trust_remote_code=True,
    )
    if DEVICE == "cpu":
        gen_model = gen_model.to(DEVICE)
    gen_model.eval()
    print("[INFO] Qwen2 generator loaded [OK]")

    yield

    print("[INFO] Shutting down...")
    del clf_model, gen_model


# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(title="Emotional Therapist API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Inference helpers ──────────────────────────────────────────────────────────
def classify_emotion(text: str) -> tuple[str, str]:
    combined = text + " [SEP] " + text
    enc = clf_tokenizer(combined, return_tensors="pt", truncation=True, padding=True, max_length=256)
    enc = {k: v.to(DEVICE) for k, v in enc.items()}
    with torch.no_grad():
        logits = clf_model(**enc).logits
        pred_id = logits.argmax().item()
    emotion = ID_TO_EMOTION.get(pred_id, "unknown")
    emoji   = EMOTION_EMOJI.get(emotion, "💬")
    return emotion, emoji


def build_messages(history: list[schemas.HistoryItem], user_msg: str, emotion: str) -> list[dict]:
    messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-6:]:
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": f"[Detected emotion: {emotion}]\nUser says: {user_msg}"})
    return messages


def generate_response(messages: list[dict], max_new_tokens: int = 200) -> str:
    raw_inputs = gen_tokenizer.apply_chat_template(
        messages, tokenize=True, add_generation_prompt=True, return_tensors="pt"
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


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "device": DEVICE}


# ── Auth ───────────────────────────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    is_admin = db.query(models.User).count() == 0
    new_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=get_password_hash(user.password),
        is_admin=is_admin
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/api/auth/login")
def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_credentials.email).first()
    if not user or not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "is_admin": user.is_admin,
        "username": user.username
    }


# ── Admin ──────────────────────────────────────────────────────────────────────

@app.get("/api/admin/stats")
def get_admin_stats(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")
    total_users    = db.query(models.User).count()
    total_sessions = db.query(models.ChatSession).count()
    total_messages = db.query(models.Conversation).count()
    users = db.query(models.User).all()
    return {
        "metrics": {
            "total_users": total_users,
            "total_sessions": total_sessions,
            "total_messages": total_messages
        },
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "is_admin": u.is_admin,
                "created_at": u.created_at
            } for u in users
        ]
    }


# ── Sessions ───────────────────────────────────────────────────────────────────

@app.get("/api/sessions", response_model=list[schemas.ChatSessionResponse])
def get_sessions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.ChatSession).filter(
        models.ChatSession.user_id == current_user.id,
        models.ChatSession.is_active == True
    ).order_by(models.ChatSession.updated_at.desc()).all()


@app.get("/api/sessions/{session_id}", response_model=list[schemas.ConversationResponse])
def get_session_messages(session_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Conversation).filter(
        models.Conversation.user_id == current_user.id,
        models.Conversation.session_id == session_id
    ).order_by(models.Conversation.created_at.asc()).all()


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.user_id == current_user.id,
        models.ChatSession.session_id == session_id
    ).first()
    if session:
        session.is_active = False
        db.commit()
    return {"status": "deleted"}


# ── Chat ───────────────────────────────────────────────────────────────────────

@app.post("/api/chat", response_model=schemas.ChatResponse)
def chat(req: schemas.ChatRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        emotion, emoji = classify_emotion(req.message)
        messages       = build_messages(req.history, req.message, emotion)
        reply          = generate_response(messages)

        user_id    = current_user.id
        session_id = req.session_id

        # Ensure session exists
        chat_session = db.query(models.ChatSession).filter(
            models.ChatSession.user_id == user_id,
            models.ChatSession.session_id == session_id
        ).first()
        if not chat_session:
            # Auto-title from the first message (truncate to 50 chars)
            auto_title = req.message[:50] + ("..." if len(req.message) > 50 else "")
            chat_session = models.ChatSession(user_id=user_id, session_id=session_id, title=auto_title)
            db.add(chat_session)
            db.commit()
            db.refresh(chat_session)

        # Persist messages
        db.add(models.Conversation(user_id=user_id, session_id=session_id, role="user", content=req.message, emotion=emotion))
        db.add(models.Conversation(user_id=user_id, session_id=session_id, role="assistant", content=reply, model_used="qwen2-1.5b-instruct"))
        chat_session.message_count += 2
        db.add(models.Prediction(user_id=user_id, text=req.message, emotion=emotion))
        db.commit()

    except HTTPException:
        raise
    except Exception:
        db.rollback()
        import traceback
        raise HTTPException(status_code=500, detail=traceback.format_exc())

    return schemas.ChatResponse(reply=reply, emotion=emotion, emoji=emoji)
