"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus, MessageSquare, Trash2, Send, Paperclip, Mic, 
  Brain, User, ChevronDown, AlignLeft
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

type Role = "user" | "assistant" | "system";

interface Message {
  id: string;
  role: Role;
  content: string;
  emotion?: string;
  emoji?: string;
  timestamp: Date;
}

interface ChatSession {
  id: number;
  session_id: string;
  title: string | null;
  updated_at: string;
}

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  content: "Hi there! 👋 I'm MindEase, your empathetic AI companion. I'm here to listen and support you. How can I help you today?",
  timestamp: new Date(),
};

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  // Start with a fresh session; only load history when user clicks a sidebar item
  const [currentSessionId, setCurrentSessionId] = useState<string>(
    searchParams.get("session") ?? crypto.randomUUID()
  );
  // Track whether this session was loaded from history (so we know to fetch messages)
  const [isHistorySession, setIsHistorySession] = useState<boolean>(
    !!searchParams.get("session")
  );
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return null;
    }
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };
  };

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Only load messages from history if we arrived with a ?session= param
  useEffect(() => {
    if (isHistorySession) {
      loadSessionMessages(currentSessionId);
    }
  }, [currentSessionId]);

  const fetchSessions = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) return;
      
      const res = await fetch(`${API_URL}/api/sessions`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        // Do NOT auto-select last session — keep fresh new chat
      } else if (res.status === 401) {
        router.push("/login");
      }
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
  };

  const loadSessionMessages = async (sid: string) => {
    if (!sid) return;
    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      const res = await fetch(`${API_URL}/api/sessions/${sid}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.length === 0) {
          setMessages([WELCOME]);
        } else {
          setMessages([WELCOME, ...data.map((m: any) => ({
            id: m.id.toString(),
            role: m.role,
            content: m.content,
            emotion: m.emotion,
            timestamp: new Date(m.created_at)
          }))]);
        }
      }
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  const startNewChat = () => {
    const newId = crypto.randomUUID();
    setCurrentSessionId(newId);
    setMessages([WELCOME]);
    setInput("");
  };

  const deleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    try {
      const headers = getAuthHeaders();
      if (!headers) return;

      await fetch(`${API_URL}/api/sessions/${sid}`, { 
        method: "DELETE",
        headers
      });
      setSessions(prev => prev.filter(s => s.session_id !== sid));
      if (currentSessionId === sid) {
        startNewChat();
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;
    
    setInput("");
    inputRef.current?.focus();

    const headers = getAuthHeaders();
    if (!headers) return;
    inputRef.current?.focus();

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text, timestamp: new Date() };
    setMessages(p => [...p, userMsg]);
    setIsTyping(true);

    try {
      const history = messages
        .filter(m => m.id !== "welcome")
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));
        
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message: text, history, session_id: currentSessionId }),
      });
      
      if (!res.ok) {
        const e = await res.json();
        if (res.status === 401) router.push("/login");
        throw new Error(e.detail ?? "Server error");
      }
      
      const data = await res.json();
      setMessages(p => [...p, {
        id: crypto.randomUUID(), role: "assistant",
        content: data.reply, emotion: data.emotion, emoji: data.emoji,
        timestamp: new Date(),
      }]);
      
      fetchSessions();
    } catch (e: any) {
      console.error(e);
      setMessages(p => [...p, {
        id: crypto.randomUUID(), role: "system", content: "Error: Could not connect to the server.", timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { 
      e.preventDefault(); 
      sendMessage(); 
    }
  };

  const adjustTextareaHeight = () => {
    const ta = inputRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#080c14] text-[#f1f5f9] overflow-hidden font-sans">
      
      {/* ── Left Sidebar ─────────────────────────────────── */}
      <div className="w-[260px] bg-[#0f1623] border-r border-white/10 flex flex-col shrink-0">
        
        {/* Top Action */}
        <div className="p-3">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#141e2e] hover:bg-[#1a2640] text-[#f1f5f9] text-sm font-medium transition-colors border border-white/10"
          >
            <Plus size={16} className="text-[#94a3b8]" />
            New Chat
          </button>
        </div>

        {/* Session List grouped by date */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {(() => {
            if (sessions.length === 0) {
              return (
                <div className="px-3 py-8 text-center text-[#475569] text-sm">
                  No conversations yet.<br/>Start chatting to see history here.
                </div>
              );
            }

            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
            const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
            const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);

            const groups: { label: string; items: typeof sessions }[] = [
              { label: "Today", items: [] },
              { label: "Yesterday", items: [] },
              { label: "Previous 7 Days", items: [] },
              { label: "Previous 30 Days", items: [] },
              { label: "Older", items: [] },
            ];

            sessions.forEach(s => {
              const d = new Date(s.updated_at);
              const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
              if (day >= today) groups[0].items.push(s);
              else if (day >= yesterday) groups[1].items.push(s);
              else if (day >= weekAgo) groups[2].items.push(s);
              else if (day >= monthAgo) groups[3].items.push(s);
              else groups[4].items.push(s);
            });

            return groups
              .filter(g => g.items.length > 0)
              .map(group => (
                <div key={group.label}>
                  <div className="px-3 pt-4 pb-1 text-xs font-semibold text-[#475569] uppercase tracking-wider">
                    {group.label}
                  </div>
                  {group.items.map(s => (
                    <div
                      key={s.session_id}
                      onClick={() => {
                        setIsHistorySession(true);
                        setCurrentSessionId(s.session_id);
                        loadSessionMessages(s.session_id);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors group ${
                        currentSessionId === s.session_id
                          ? "bg-[#141e2e] text-white"
                          : "text-[#94a3b8] hover:bg-[#111827] hover:text-white"
                      }`}
                    >
                      <span className="truncate flex-1 text-[13px]">
                        {s.title || "New conversation"}
                      </span>
                      <button
                        onClick={(e) => deleteSession(e, s.session_id)}
                        className={`ml-2 text-[#475569] hover:text-red-400 transition-opacity shrink-0 ${
                          currentSessionId === s.session_id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ));
          })()}
        </div>
        
        {/* Sidebar Footer */}
        <div className="flex flex-col border-t border-white/10 mt-auto">
          <Link 
            href="/history"
            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#141e2e] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
              <MessageSquare size={16} className="text-blue-400" />
            </div>
            <span className="text-sm font-medium flex-1 text-[#f1f5f9]">Chat History</span>
          </Link>

          <Link 
            href="/admin"
            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-[#141e2e] transition-colors border-t border-white/5"
          >
            <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
              <User size={16} className="text-purple-400" />
            </div>
            <span className="text-sm font-medium flex-1 text-[#f1f5f9]">Admin Dashboard</span>
          </Link>

          <div 
            onClick={() => {
              localStorage.removeItem("token");
              router.push("/login");
            }}
            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-red-500/10 transition-colors border-t border-white/5"
          >
            <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center shrink-0">
              <User size={16} className="text-red-400" />
            </div>
            <span className="text-sm font-medium flex-1 text-red-400">Log out</span>
          </div>
        </div>
        
      </div>

      {/* ── Main Chat Area ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative bg-[#080c14] h-full overflow-hidden">
        
        {/* Top Nav */}
        <header className="p-4 flex items-center justify-between border-b border-transparent">
          <div className="text-lg font-semibold flex items-center gap-1 text-[#f1f5f9] cursor-pointer">
            MindEase <ChevronDown size={20} className="text-[#475569]" />
          </div>
        </header>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            
            if (m.role === "system") {
              return <div key={idx} className="text-center text-red-400 p-5">{m.content}</div>;
            }

            return (
              <div key={m.id} className="max-w-3xl mx-auto py-6 flex gap-4 w-full">
                
                {/* Bot Avatar */}
                {!isUser && (
                  <div className="w-8 h-8 shrink-0 rounded-full border border-blue-500/30 flex items-center justify-center bg-[#0f1623]">
                    <Brain size={20} className="text-blue-400" />
                  </div>
                )}
                
                <div className={`flex flex-col ${isUser ? "items-end w-full" : "w-full"}`}>
                   {/* Emotion Badge for Bot */}
                   {!isUser && m.emotion && (
                     <span className="text-xs font-medium bg-blue-900/40 text-blue-300 px-2.5 py-1 rounded-full mb-2 self-start border border-blue-500/20">
                       {m.emoji} {m.emotion}
                     </span>
                   )}
                   
                   <div className={`text-[15px] leading-relaxed ${isUser ? "bg-blue-600 px-5 py-3 rounded-3xl max-w-[70%] text-white" : "text-[#f1f5f9] py-1"}`}>
                     {m.content}
                   </div>
                </div>
                
              </div>
            );
          })}
          
          {isTyping && (
             <div className="max-w-3xl mx-auto py-6 flex gap-4 w-full">
               <div className="w-8 h-8 shrink-0 rounded-full border border-blue-500/30 flex items-center justify-center bg-[#0f1623]">
                 <Brain size={20} className="text-blue-400" />
               </div>
               <div className="flex items-center gap-1.5 py-3">
                 <span className="w-1.5 h-1.5 bg-[#475569] rounded-full animate-pulse" />
                 <span className="w-1.5 h-1.5 bg-[#475569] rounded-full animate-pulse delay-150" />
                 <span className="w-1.5 h-1.5 bg-[#475569] rounded-full animate-pulse delay-300" />
               </div>
             </div>
          )}
          
          <div ref={endRef} className="h-8" />
        </div>

        {/* Bottom Input Area */}
        <div className="p-4 w-full max-w-3xl mx-auto">
          
          {/* Starter Prompts just above the input */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                "I'm feeling anxious lately...",
                "I need to talk about something",
                "I've been really sad today",
                "I just need someone to listen"
              ].map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(prompt);
                    inputRef.current?.focus();
                  }}
                  className="px-4 py-2 rounded-full border border-white/10 hover:bg-[#141e2e] transition-colors text-sm text-[#94a3b8] hover:text-[#f1f5f9]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          <div className="bg-[#0f1623] rounded-3xl px-4 py-2 flex items-end gap-2 border border-white/10 focus-within:border-white/20 transition-colors">
            
            <button className="p-2 text-[#475569] hover:text-[#94a3b8] transition-colors">
              <Paperclip size={20} />
            </button>
            
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => {
                setInput(e.target.value);
                adjustTextareaHeight();
              }}
              onKeyDown={onKey}
              placeholder="Message MindEase..."
              className="flex-1 bg-transparent border-none outline-none resize-none py-2 text-[15px] leading-[24px] text-white max-h-[200px]"
              rows={1}
            />
            
            <button className="p-2 text-[#475569] hover:text-[#94a3b8] transition-colors">
              <Mic size={20} />
            </button>
            
            <button 
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className={`p-2 rounded-full flex items-center justify-center transition-colors mb-0.5 ${
                input.trim() ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-[#141e2e] text-[#475569] cursor-not-allowed"
              }`}
            >
              <Send size={18} />
            </button>
            
          </div>
          <div className="text-center text-xs text-[#475569] mt-3">
            MindEase AI can make mistakes. Check important info.
          </div>
        </div>

      </div>
    </div>
  );
}
