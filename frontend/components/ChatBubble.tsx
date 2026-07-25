"use client";

import { Message } from "@/app/types";
import { Brain } from "lucide-react";


interface Props {
  message: Message;
  isNew?: boolean;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatBubble({ message, isNew = false }: Props) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-end gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} ${
        isNew ? "animate-fade-in-up" : ""
      }`}
    >
      {/* Avatar — only for assistant */}
      {!isUser && (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md"
          style={{
            background: "linear-gradient(135deg, #1557b0, #4a9eff)",
          }}
        >
          <Brain className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={`flex flex-col gap-1 max-w-[72%] ${isUser ? "items-end" : "items-start"}`}
      >


        {/* Bubble */}
        <div
          className="px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-md"
          style={
            isUser
              ? {
                  background: "var(--bubble-user)",
                  color: "#fff",
                  borderBottomRightRadius: "4px",
                }
              : {
                  background: "var(--bubble-bot)",
                  color: "var(--text-primary)",
                  borderBottomLeftRadius: "4px",
                  border: "1px solid var(--border-color)",
                }
          }
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <span className="text-xs" style={{ color: "var(--text-secondary)" }} suppressHydrationWarning>
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
