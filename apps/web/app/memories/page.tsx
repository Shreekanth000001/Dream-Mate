"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

export default function MemoriesPage() {
  const router = useRouter();
  const [memories, setMemories] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getMemories().then((data: unknown) => {
      if (mounted) {
        setMemories(data as unknown[]);
        setLoading(false);
      }
    }).catch((e: unknown) => {
      if (mounted) {
        console.error(e);
        router.push('/auth');
      }
    });
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMemory(id);
      setMemories(memories.filter((m: unknown) => (m as Record<string, unknown>).id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-zinc-950 text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex items-center gap-6 mb-12 border-b border-zinc-800 pb-6">
          <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800" onClick={() => router.push('/')}>
            ← Back
          </Button>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            Companion Memory
          </h1>
        </header>

        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <span>🧠</span> Long-term memories
          </h2>
          <div className="space-y-4">
            {memories.filter((m: unknown) => (m as Record<string, unknown>).importance as number >= 5).length === 0 ? (
              <p className="text-zinc-500 italic">No long-term memories yet.</p>
            ) : (
              memories.filter((m: unknown) => (m as Record<string, unknown>).importance as number >= 5).map((m: unknown) => {
                const mem = m as Record<string, unknown>;
                return (
                <div key={mem.id as string} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex justify-between items-center group">
                  <p className="text-zinc-300">&quot;{mem.content as string}&quot;</p>
                  <Button variant="ghost" className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(mem.id as string)}>
                    Forget
                  </Button>
                </div>
              )})
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <span>📖</span> Recent observations
          </h2>
          <div className="space-y-4">
            {memories.filter((m: unknown) => (m as Record<string, unknown>).importance as number < 5).length === 0 ? (
              <p className="text-zinc-500 italic">No recent observations.</p>
            ) : (
              memories.filter((m: unknown) => (m as Record<string, unknown>).importance as number < 5).map((m: unknown) => {
                const mem = m as Record<string, unknown>;
                return (
                <div key={mem.id as string} className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50 flex justify-between items-center group">
                  <p className="text-zinc-400">&quot;{mem.content as string}&quot;</p>
                  <Button variant="ghost" className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(mem.id as string)}>
                    Forget
                  </Button>
                </div>
              )})
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
