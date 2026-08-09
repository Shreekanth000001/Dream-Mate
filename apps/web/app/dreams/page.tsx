"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function DreamsPage() {
  const router = useRouter();
  const [dreams, setDreams] = useState<unknown[]>([]);
  const [tasks, setTasks] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [d, t] = await Promise.all([api.getDreams(), api.getTasks()]);
        setDreams(d);
        setTasks(t);
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
        <header className="flex items-center justify-between mb-12 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-6">
            <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800" onClick={() => router.push('/')}>
              ← Back
            </Button>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
              Dream Map
            </h1>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700">Add Dream</Button>
        </header>

        <div className="space-y-12">
          {dreams.length === 0 ? (
            <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed">
              <p className="text-zinc-400 text-lg mb-4">You haven&apos;t defined any dreams yet.</p>
              <Button>Start your journey</Button>
            </div>
          ) : (
            dreams.map((dream: unknown) => {
              const d = dream as Record<string, unknown>;
              return (
              <div key={d.id as string} className="relative pl-8 border-l-2 border-emerald-900/50">
                <div className="absolute w-4 h-4 rounded-full bg-emerald-500 -left-[9px] top-2 shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                <h2 className="text-2xl font-bold mb-2">{d.title as string}</h2>
                <p className="text-zinc-400 mb-6">{d.description as string}</p>
                
                {/* Simulated Goals (Currently tasks map directly to dreams via goals in DB, grouping by goal logic simplified for MVP) */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 text-zinc-300 border-b border-zinc-800 pb-2">Active Tasks</h3>
                  <div className="space-y-3">
                    {tasks.length === 0 ? (
                      <p className="text-zinc-500 text-sm">No tasks assigned to this dream yet.</p>
                    ) : (
                      tasks.map((task: unknown) => {
                        const t = task as Record<string, unknown>;
                        return (
                        <div key={t.id as string} className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800/50 hover:border-zinc-700 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded flex items-center justify-center border ${t.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600'}`}>
                              {t.status === 'completed' && <span className="text-zinc-950 text-xs">✓</span>}
                            </div>
                            <span className={t.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-200'}>
                              {t.title as string}
                            </span>
                          </div>
                          {Boolean(t.due_date) && <span className="text-xs text-zinc-500">Due: {new Date(t.due_date as string).toLocaleDateString()}</span>}
                        </div>
                      )})
                    )}
                  </div>
                </div>
              </div>
            )})
          )}
        </div>
      </div>
    </div>
  );
}
