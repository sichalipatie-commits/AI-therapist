"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brain, ArrowLeft, MessageSquare, Clock, Trash2, ChevronDown, ChevronRight } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

interface Session {
  id: number;
  session_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface Message {
  id: number;
  role: string;
  content: string;
  emotion: string | null;
  created_at: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return null; }
    return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
  };

  useEffect(() => {
    const fetchSessions = async () => {
      const headers = getAuthHeaders();
      if (!headers) return;
      try {
        const res = await fetch(`${API_URL}/api/sessions`, { headers });
        if (res.status === 401) { router.push("/login"); return; }
        if (res.ok) setSessions(await res.json());
      } catch (err) {
        console.error("Failed to fetch sessions", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const toggleSession = async (sid: string) => {
    if (expandedSession === sid) {
      setExpandedSession(null);
      return;
    }
    setExpandedSession(sid);
    if (sessionMessages[sid]) return;

    const headers = getAuthHeaders();
    if (!headers) return;
    try {
      const res = await fetch(`${API_URL}/api/sessions/${sid}`, { headers });
      if (res.ok) {
        const msgs = await res.json();
        setSessionMessages(prev => ({ ...prev, [sid]: msgs }));
      }
    } catch (err) {
      console.error("Failed to load messages", err);
    }
  };

  const deleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    const headers = getAuthHeaders();
    if (!headers) return;
    try {
      await fetch(`${API_URL}/api/sessions/${sid}`, { method: "DELETE", headers });
      setSessions(prev => prev.filter(s => s.session_id !== sid));
      if (expandedSession === sid) setExpandedSession(null);
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  // Group by date
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7);
  const monthAgo = new Date(today); monthAgo.setDate(today.getDate() - 30);

  const groups: { label: string; items: Session[] }[] = [
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

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-[#080c14] text-[#f1f5f9] font-sans">
      <div className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/chat"
            className="w-10 h-10 rounded-full bg-[#0f1623] border border-white/10 flex items-center justify-center hover:bg-[#141e2e] transition-colors"
          >
            <ArrowLeft size={18} className="text-[#94a3b8]" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Chat History</h1>
            <p className="text-[#94a3b8] text-sm mt-0.5">{sessions.length} conversation{sessions.length !== 1 ? "s" : ""} saved</p>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-[#475569] py-16">Loading your conversations...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-[#0f1623] flex items-center justify-center mx-auto mb-4 border border-white/10">
              <MessageSquare size={28} className="text-[#475569]" />
            </div>
            <p className="text-[#94a3b8] text-lg font-medium mb-2">No conversations yet</p>
            <p className="text-[#475569] text-sm mb-6">Start chatting with MindEase to see your history here.</p>
            <Link href="/chat" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
              Start a conversation
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.filter(g => g.items.length > 0).map(group => (
              <div key={group.label}>
                <h2 className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-3 px-1">
                  {group.label}
                </h2>
                <div className="space-y-2">
                  {group.items.map(session => (
                    <div key={session.session_id} className="bg-[#0f1623] rounded-xl border border-white/10 overflow-hidden">
                      
                      {/* Session Header */}
                      <div
                        onClick={() => toggleSession(session.session_id)}
                        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-[#141e2e] transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                          <Brain size={18} className="text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-white truncate">
                            {session.title || "New conversation"}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-[#475569] flex items-center gap-1">
                              <Clock size={11} /> {formatTime(session.updated_at)}
                            </span>
                            <span className="text-xs text-[#475569]">
                              {session.message_count} message{session.message_count !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => deleteSession(e, session.session_id)}
                            className="p-1.5 text-[#475569] hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10"
                          >
                            <Trash2 size={14} />
                          </button>
                          <Link
                            href={`/chat?session=${session.session_id}`}
                            onClick={e => e.stopPropagation()}
                            className="p-1.5 text-[#475569] hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-500/10"
                            title="Open in chat"
                          >
                            <MessageSquare size={14} />
                          </Link>
                          {expandedSession === session.session_id
                            ? <ChevronDown size={16} className="text-[#475569]" />
                            : <ChevronRight size={16} className="text-[#475569]" />
                          }
                        </div>
                      </div>

                      {/* Expanded Messages */}
                      {expandedSession === session.session_id && (
                        <div className="border-t border-white/10 px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
                          {!sessionMessages[session.session_id] ? (
                            <p className="text-[#475569] text-sm text-center py-4">Loading...</p>
                          ) : sessionMessages[session.session_id].length === 0 ? (
                            <p className="text-[#475569] text-sm text-center py-4">No messages in this session.</p>
                          ) : (
                            sessionMessages[session.session_id].map(msg => (
                              <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                {msg.role === "assistant" && (
                                  <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <Brain size={12} className="text-blue-400" />
                                  </div>
                                )}
                                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                                  msg.role === "user"
                                    ? "bg-blue-600 text-white rounded-br-sm"
                                    : "bg-[#141e2e] text-[#f1f5f9] rounded-bl-sm"
                                }`}>
                                  {msg.content}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
