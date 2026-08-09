"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<unknown>(null);
  const [dreams, setDreams] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth');
      return;
    }

    const loadData = async () => {
      try {
        const u = await api.getMe();
        setUser(u);
        const d = await api.getDreams();
        setDreams(d);
      } catch (e) {
        console.error(e);
        router.push('/auth');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            DREAMMATE
          </h1>
          <div className="flex gap-4">
            <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => router.push('/dreams')}>
              Dream Map
            </Button>
            <Button variant="ghost" className="text-zinc-400 hover:text-white" onClick={() => router.push('/memories')}>
              Memories
            </Button>
            <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800" onClick={() => {
              localStorage.removeItem('token');
              router.push('/auth');
            }}>
              Logout
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => router.push('/chat')}>
              Talk to Companion
            </Button>
          </div>
        </header>

        <section className="mb-12">
          <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-2">
            <h2 className="text-2xl font-semibold">Your Dreams</h2>
            <Button variant="link" className="text-blue-400" onClick={() => router.push('/dreams')}>View Full Map →</Button>
          </div>
          {dreams.length === 0 ? (
            <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 text-center">
              <p className="text-zinc-400 mb-4">You haven&apos;t defined any dreams yet.</p>
              <Button onClick={() => alert("Goal creation UI coming soon!")}>Create a Dream</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dreams.map((dream: unknown) => {
              const d = dream as Record<string, unknown>;
              return (
                <div key={d.id as string} className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 hover:border-zinc-600 transition-colors">
                  <h3 className="text-xl font-bold mb-2">{d.title as string}</h3>
                  <p className="text-zinc-400 text-sm mb-4">{d.description as string}</p>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 w-1/3 h-full"></div>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2 text-right">In Progress</p>
                </div>
              )})}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-6 border-b border-zinc-800 pb-2">Today&apos;s Focus</h2>
          <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/50">
            <p className="text-zinc-400">No pending tasks for today. Maybe talk to your companion to plan your next steps!</p>
          </div>
        </section>
      </div>
    </div>
  );
}
