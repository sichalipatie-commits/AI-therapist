"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Send, Brain, MoreVertical,
  Trash2, RefreshCw, Info, AlertCircle, Wifi, WifiOff,
} from "lucide-react";
import { Message } from "@/app/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hello 👋 I'm MindEase, your empathetic AI companion. I'm here to listen and support you. How are you feeling today?",
  timestamp: new Date(),
};

const QUICK_PROMPTS = [
  "I'm feeling anxious lately…",
  "I need to talk about something",
  "I've been really sad today",
  "I just need someone to listen",
];

function fmtTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

/* ── Typing dots (shown while waiting for first token) ─────────────────────── */
function TypingDots() {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #1d4ed8, #60a5fa)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 12px rgba(59,130,246,0.35)",
      }}>
        <Brain size={16} color="white" />
      </div>
      <div style={{
        padding: "12px 16px",
        background: "var(--bubble-bot)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "18px 18px 18px 4px",
        display: "flex", gap: 5, alignItems: "center",
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} className="dot-pulse" style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "var(--accent-light)",
            display: "block",
            animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ── Cursor blink for streaming text ───────────────────────────────────────── */
function StreamingCursor() {
  return (
    <span style={{
      display: "inline-block",
      width: 2,
      height: "1em",
      background: "var(--accent-light)",
      marginLeft: 2,
      verticalAlign: "text-bottom",
      animation: "blink 1s step-end infinite",
    }} />
  );
}

/* ── Chat bubble ───────────────────────────────────────────────────────────── */
function Bubble({ msg, isNew, isStreaming }: { msg: Message; isNew: boolean; isStreaming?: boolean }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={isNew ? "fade-up" : ""}
      style={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 10,
      }}
    >
      {!isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #1d4ed8, #60a5fa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 12px rgba(59,130,246,0.35)",
        }}>
          <Brain size={16} color="white" />
        </div>
      )}

      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        maxWidth: "70%", gap: 4,
      }}>


        {/* Bubble */}
        <div style={{
          padding: "10px 14px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser
            ? "linear-gradient(135deg, #1d4ed8, #3b82f6)"
            : "var(--bubble-bot)",
          border: isUser ? "none" : "1px solid rgba(255,255,255,0.07)",
          color: "var(--text-primary)",
          fontSize: 14,
          lineHeight: 1.6,
          boxShadow: isUser
            ? "0 4px 16px rgba(29,78,216,0.4)"
            : "0 2px 8px rgba(0,0,0,0.3)",
          wordBreak: "break-word",
          minHeight: isStreaming && !msg.content ? 42 : undefined,
        }}>
          {msg.content || (isStreaming ? "" : "…")}
          {isStreaming && <StreamingCursor />}
        </div>

        {/* Timestamp */}
        <span suppressHydrationWarning style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {fmtTime(msg.timestamp)}
        </span>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [apiStatus, setApiStatus] = useState<"ok" | "error" | "checking">("checking");

  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef  = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then(r => r.json())
      .then(() => setApiStatus("ok"))
      .catch(() => setApiStatus("error"));
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setError(null);
    setInput("");
    inputRef.current?.focus();

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date() };
    setMessages(p => [...p, userMsg]);
    setIsTyping(true);

    // Create a placeholder bot message that we'll fill in token by token
    const botId = crypto.randomUUID();
    const botMsg: Message = { id: botId, role: "assistant", content: "", timestamp: new Date() };

    try {
      const history = messages
        .filter(m => m.id !== "welcome")
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_URL}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail ?? "Server error");
      }

      // Add the empty bot bubble and mark it as streaming
      setMessages(p => [...p, botMsg]);
      setStreamingId(botId);
      setIsTyping(false);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE lines end with \n\n — process all complete events in the buffer
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? ""; // last part may be incomplete

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.slice(6));

          if (payload.type === "meta") {
            // Attach emotion + emoji to the bubble
            setMessages(p =>
              p.map(m => m.id === botId
                ? { ...m, emotion: payload.emotion, emoji: payload.emoji }
                : m
              )
            );
          } else if (payload.type === "token") {
            // Append token to the bubble
            setMessages(p =>
              p.map(m => m.id === botId
                ? { ...m, content: m.content + payload.text }
                : m
              )
            );
            endRef.current?.scrollIntoView({ behavior: "smooth" });
          } else if (payload.type === "done") {
            setStreamingId(null);
          }
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      // Remove the empty placeholder if streaming never started
      setMessages(p => p.filter(m => m.id !== botId || m.content !== ""));
    } finally {
      setIsTyping(false);
      setStreamingId(null);
    }
  }, [input, isTyping, messages]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => { setMessages([WELCOME]); setError(null); setShowMenu(false); };

  const statusColor = { ok: "#22c55e", error: "#ef4444", checking: "#f59e0b" }[apiStatus];
  const statusLabel = { ok: "Online", error: "Backend offline", checking: "Connecting…" }[apiStatus];
  const StatusIcon  = apiStatus === "ok" ? Wifi : WifiOff;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-dark)", position: "relative", overflow: "hidden" }}>

      {/* Mesh background */}
      <div className="bg-mesh" />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        flexShrink: 0,
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 16px",
        borderBottom: "1px solid var(--border)",
        background: "rgba(8,12,20,0.9)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        zIndex: 10,
        position: "relative",
      }}>
        <button
          onClick={() => router.push("/")}
          aria-label="Back"
          style={{
            width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border)",
            background: "transparent", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center",
            transition: "background 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <ArrowLeft size={18} color="var(--text-secondary)" />
        </button>

        <div style={{
          width: 38, height: 38, borderRadius: "50%",
          background: "linear-gradient(135deg, #1d4ed8, #60a5fa)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 14px rgba(59,130,246,0.4)", flexShrink: 0,
        }}>
          <Brain size={18} color="white" />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1 }}>
            MindEase
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
            <StatusIcon size={11} color={statusColor} />
            <span style={{ fontSize: 11, color: statusColor }}>{statusLabel}</span>
          </div>
        </div>

        {/* Overflow menu */}
        <div style={{ position: "relative" }} ref={menuRef}>
          <button
            onClick={() => setShowMenu(p => !p)}
            aria-label="Options"
            style={{
              width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border)",
              background: "transparent", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <MoreVertical size={17} color="var(--text-secondary)" />
          </button>

          {showMenu && (
            <div style={{
              position: "absolute", right: 0, top: 44,
              width: 176, borderRadius: 14, overflow: "hidden",
              background: "var(--bg-card-2)", border: "1px solid var(--border)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.5)", zIndex: 100,
            }}>
              {[
                { icon: Trash2, label: "Clear chat", action: clearChat },
                { icon: RefreshCw, label: "Restart session", action: () => window.location.reload() },
              ].map(({ icon: Icon, label, action }) => (
                <button key={label} onClick={action} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 16px", background: "transparent", border: "none",
                  cursor: "pointer", fontSize: 13, color: "var(--text-primary)",
                  transition: "background 0.15s",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <Icon size={15} /> {label}
                </button>
              ))}
              <div style={{ height: 1, margin: "0 12px", background: "var(--border)" }} />
              <button onClick={() => setShowMenu(false)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "11px 16px", background: "transparent", border: "none",
                cursor: "pointer", fontSize: 12, color: "var(--text-muted)",
              }}>
                <Info size={14} /> Not a substitute for therapy
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Messages ─────────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16,
      }}>
        {/* Date chip */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </span>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        {messages.map((msg, i) => (
          <Bubble
            key={msg.id}
            msg={msg}
            isNew={i === messages.length - 1 && msg.role === "assistant"}
            isStreaming={msg.id === streamingId}
          />
        ))}

        {/* Typing dots only shown while waiting for the first token */}
        {isTyping && <TypingDots />}

        {error && (
          <div className="fade-up" style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            padding: "12px 16px", borderRadius: 14, fontSize: 13,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#fca5a5",
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            <span><strong>Error:</strong> {error}. Start the Python backend on port 8000.</span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* ── Input bar ────────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: "10px 14px 14px",
        borderTop: "1px solid var(--border)",
        background: "rgba(8,12,20,0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        position: "relative", zIndex: 10,
      }}>
        {/* Quick prompts */}
        {messages.length === 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}>
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => { setInput(p); inputRef.current?.focus(); }}
                style={{
                  padding: "5px 12px", borderRadius: 99,
                  border: "1px solid var(--border)",
                  background: "transparent", cursor: "pointer",
                  fontSize: 12, color: "var(--text-secondary)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent-light)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input row */}
        <div style={{
          display: "flex", alignItems: "flex-end", gap: 10,
          padding: "10px 12px",
          borderRadius: 16,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          transition: "border-color 0.2s",
        }}>
          <textarea
            ref={inputRef}
            id="chat-input"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Share what's on your mind…"
            disabled={isTyping || !!streamingId}
            style={{
              flex: 1, resize: "none", background: "transparent", border: "none",
              outline: "none", fontSize: 14, lineHeight: 1.55,
              color: "var(--text-primary)", maxHeight: 120, overflowY: "auto",
              caretColor: "var(--accent-light)",
              opacity: isTyping || streamingId ? 0.5 : 1,
            }}
          />
          <button
            id="send-btn"
            onClick={sendMessage}
            disabled={!input.trim() || isTyping || !!streamingId}
            aria-label="Send"
            style={{
              width: 36, height: 36, borderRadius: 10, border: "none",
              background: input.trim() && !isTyping && !streamingId
                ? "linear-gradient(135deg, #1d4ed8, #3b82f6)"
                : "rgba(255,255,255,0.06)",
              cursor: input.trim() && !isTyping && !streamingId ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "all 0.2s",
              boxShadow: input.trim() && !isTyping && !streamingId ? "0 0 16px rgba(59,130,246,0.4)" : "none",
            }}
          >
            <Send size={16} color={input.trim() && !isTyping && !streamingId ? "white" : "var(--text-muted)"} />
          </button>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
