"use client";

import { Brain } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 animate-fade-in-up">
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md"
        style={{ background: "linear-gradient(135deg, #1557b0, #4a9eff)" }}
      >
        <Brain className="w-4 h-4 text-white" />
      </div>

      {/* Dots bubble */}
      <div
        className="px-5 py-4 rounded-2xl flex items-center gap-1.5 shadow-md"
        style={{
          background: "var(--bubble-bot)",
          border: "1px solid var(--border-color)",
          borderBottomLeftRadius: "4px",
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-2 h-2 rounded-full animate-dot"
            style={{
              background: "var(--accent-blue-light)",
              animationDelay: `${i * 0.22}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
