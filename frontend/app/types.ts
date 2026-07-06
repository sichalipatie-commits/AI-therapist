// Shared TypeScript types for the chat
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  emotion?: string;
  emoji?: string;
  timestamp: Date;
}

export interface ApiResponse {
  reply: string;
  emotion: string;
  emoji: string;
}
