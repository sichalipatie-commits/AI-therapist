"use client";

import { useRouter } from "next/navigation";
import { Brain, Heart, MessageCircle, Shield, Sparkles, ArrowRight, Zap } from "lucide-react";

const features = [
  {
    icon: Brain,
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.2)",
    title: "Emotion Intelligence",
    desc: "DistilBERT classifies your emotions across 31 emotional states in real time.",
  },
  {
    icon: MessageCircle,
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.2)",
    title: "Empathetic Responses",
    desc: "Qwen2 generates warm, contextual therapeutic replies tailored to how you feel.",
  },
  {
    icon: Heart,
    color: "#f472b6",
    glow: "rgba(244,114,182,0.2)",
    title: "Non-judgmental Space",
    desc: "Share freely. MindEase listens without judgment and responds with compassion.",
  },
  {
    icon: Shield,
    color: "#34d399",
    glow: "rgba(52,211,153,0.2)",
    title: "Private & Secure",
    desc: "Your conversations stay local. No data is stored or shared externally.",
  },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        background: "var(--bg-dark)",
        position: "relative",
      }}
    >
      {/* Mesh background */}
      <div className="bg-mesh" />

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 32px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(8,12,20,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 16px rgba(59,130,246,0.4)",
            }}
          >
            <Brain size={18} color="white" />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
            MindEase
          </span>
        </div>

        <button
          onClick={() => router.push("/register")}
          className="btn-glow"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 20px",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
            color: "white",
          }}
        >
          Start Session <ArrowRight size={15} />
        </button>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          padding: "60px 24px 48px",
          position: "relative",
        }}
      >
        {/* Badge */}
        <div
          className="fade-up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: 99,
            border: "1px solid rgba(59,130,246,0.3)",
            background: "rgba(59,130,246,0.08)",
            marginBottom: 24,
            animationDelay: "0.1s",
          }}
        >
          <Sparkles size={13} color="var(--accent-light)" />
          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--accent-light)" }}>
            AI-Powered Emotional Support
          </span>
          <Zap size={12} color="var(--accent-light)" />
        </div>

        {/* Brain orb */}
        <div className="float-anim fade-up" style={{ marginBottom: 28, animationDelay: "0.15s", position: "relative" }}>
          {/* Outer glow rings */}
          <div
            style={{
              position: "absolute",
              inset: -20,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)",
              animation: "pulseDot 3s ease-in-out infinite",
            }}
          />
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #60a5fa 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 50px rgba(59,130,246,0.5), 0 20px 40px rgba(0,0,0,0.4)",
              position: "relative",
            }}
          >
            <Brain size={44} color="white" />
          </div>
        </div>

        {/* Headlines */}
        <h1
          className="fade-up"
          style={{
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-1px",
            color: "var(--text-primary)",
            marginBottom: 8,
            animationDelay: "0.2s",
            maxWidth: 640,
          }}
        >
          You&apos;re not alone.
        </h1>
        <h2
          className="gradient-text fade-up"
          style={{
            fontSize: "clamp(32px, 5vw, 56px)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-1px",
            marginBottom: 20,
            animationDelay: "0.25s",
          }}
        >
          MindEase is here.
        </h2>

        <p
          className="fade-up"
          style={{
            fontSize: 16,
            color: "var(--text-secondary)",
            maxWidth: 460,
            lineHeight: 1.7,
            marginBottom: 36,
            animationDelay: "0.3s",
          }}
        >
          A compassionate AI therapist that listens, understands your emotions, and responds
          with empathy — available whenever you need someone to talk to.
        </p>

        {/* CTA button */}
        <div className="fade-up" style={{ animationDelay: "0.35s" }}>
          <button
            id="begin-session-btn"
            onClick={() => router.push("/register")}
            className="btn-glow"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "14px 32px",
              borderRadius: 16,
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              fontWeight: 700,
              color: "white",
              letterSpacing: "-0.2px",
            }}
          >
            Begin Your Session
            <ArrowRight size={18} />
          </button>
        </div>

        <p
          className="fade-up"
          style={{ marginTop: 14, fontSize: 12, color: "var(--text-muted)", animationDelay: "0.4s" }}
        >
          Free · Private · Secure
        </p>
      </section>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto 40px",
          height: 1,
          background: "linear-gradient(90deg, transparent, var(--border), transparent)",
        }}
      />

      {/* ── Feature Cards ───────────────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "0 24px 60px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {features.map(({ icon: Icon, color, glow, title, desc }, i) => (
          <div
            key={title}
            className="feature-card fade-up"
            style={{
              padding: "20px",
              animationDelay: `${0.45 + i * 0.08}s`,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: glow,
                border: `1px solid ${color}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
                boxShadow: `0 0 16px ${glow}`,
              }}
            >
              <Icon size={20} color={color} />
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
              {title}
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>
              {desc}
            </p>
          </div>
        ))}
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer
        style={{
          textAlign: "center",
          padding: "16px 24px 24px",
          fontSize: 11,
          color: "var(--text-muted)",
          borderTop: "1px solid var(--border)",
        }}
      >
        MindEase — Powered by DistilBERT + Qwen2.5-1.5B-Instruct · For emotional support only,
        not a substitute for professional therapy.
      </footer>
    </div>
  );
}
