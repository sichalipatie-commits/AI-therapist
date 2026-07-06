"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, MessageSquare, Activity, LogOut } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

interface AdminStats {
  metrics: {
    total_users: number;
    total_sessions: number;
    total_messages: number;
  };
  users: {
    id: number;
    username: string;
    email: string;
    is_admin: boolean;
    created_at: string;
  }[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/admin/stats`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        if (res.status === 401 || res.status === 403) {
          throw new Error("Not authorized to view this page");
        }
        
        if (!res.ok) throw new Error("Failed to load admin data");

        const data = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#080c14] flex items-center justify-center text-white">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#080c14] flex flex-col items-center justify-center text-white p-4">
        <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-xl max-w-md text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Link href="/chat" className="bg-[#141e2e] px-4 py-2 rounded-lg hover:bg-[#1f2937] transition">Go to Chat</Link>
            <button onClick={handleLogout} className="bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-500 transition">Log out</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080c14] text-[#f1f5f9] font-sans p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-[#94a3b8]">Monitor MindEase platform metrics and users</p>
          </div>
          <div className="flex gap-4">
            <Link href="/chat" className="px-4 py-2 bg-[#141e2e] border border-white/10 rounded-lg text-sm hover:bg-[#1f2937] transition">
              Open Chat
            </Link>
            <button onClick={handleLogout} className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/20 flex items-center gap-2 transition">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#0f1623] border border-white/10 p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Users className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-[#94a3b8]">Total Users</p>
              <p className="text-2xl font-bold">{stats?.metrics.total_users}</p>
            </div>
          </div>
          
          <div className="bg-[#0f1623] border border-white/10 p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <Activity className="text-green-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-[#94a3b8]">Chat Sessions</p>
              <p className="text-2xl font-bold">{stats?.metrics.total_sessions}</p>
            </div>
          </div>
          
          <div className="bg-[#0f1623] border border-white/10 p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
              <MessageSquare className="text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-sm text-[#94a3b8]">Messages Exchanged</p>
              <p className="text-2xl font-bold">{stats?.metrics.total_messages}</p>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-[#0f1623] border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold">Registered Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#141e2e] text-[#94a3b8] text-sm">
                  <th className="p-4 font-medium">ID</th>
                  <th className="p-4 font-medium">Username</th>
                  <th className="p-4 font-medium">Email</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {stats?.users.map(user => (
                  <tr key={user.id} className="hover:bg-[#141e2e] transition-colors">
                    <td className="p-4 text-[#94a3b8]">#{user.id}</td>
                    <td className="p-4 font-medium text-white">{user.username}</td>
                    <td className="p-4 text-[#94a3b8]">{user.email}</td>
                    <td className="p-4">
                      {user.is_admin ? (
                        <span className="bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full text-xs font-semibold">Admin</span>
                      ) : (
                        <span className="bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-full text-xs font-semibold">User</span>
                      )}
                    </td>
                    <td className="p-4 text-[#94a3b8]">{new Date(user.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats?.users.length === 0 && (
              <div className="p-8 text-center text-[#94a3b8]">No users found.</div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
