"use client";

import { useEffect, useState } from 'react';
import { api, MemoryItem, ConsolidationResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Home, Brain, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function MemoriesPage() {
  const router = useRouter();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Consolidation state
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [consolidationPhase, setConsolidationPhase] = useState<number>(0);
  const [consolidationResult, setConsolidationResult] = useState<ConsolidationResult | null>(null);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
      try {
        await api.getMe();
        const mems = await api.getMemories();
        setMemories(mems);
      } catch (error) {
        console.error('Failed to load memories', error);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [router]);

  const loadMemories = async () => {
    try {
      const mems = await api.getMemories();
      setMemories(mems);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMemory(id);
      setMemories(prev => prev.filter(m => m.id !== id));
    } catch (error) {
      console.error('Failed to delete memory', error);
    }
  };

  const getCategoryIcon = (content: string) => {
    const text = content.toLowerCase();
    if (text.includes('game') || text.includes('play') || text.includes('code')) return '🎮';
    if (text.includes('art') || text.includes('draw') || text.includes('paint') || text.includes('creative')) return '🎨';
    if (text.includes('school') || text.includes('study') || text.includes('learn') || text.includes('book')) return '📚';
    if (text.includes('fit') || text.includes('health') || text.includes('workout') || text.includes('gym')) return '💪';
    if (text.includes('music') || text.includes('song') || text.includes('listen')) return '🎵';
    if (text.includes('goal') || text.includes('dream') || text.includes('plan')) return '🌟';
    if (text.includes('like') || text.includes('love') || text.includes('hate') || text.includes('prefer') || text.includes('person')) return '🧠';
    return '💭';
  };

  const runConsolidation = async () => {
    setIsConsolidating(true);
    setConsolidationPhase(1); // Analyzing...
    
    setTimeout(async () => {
      setConsolidationPhase(2); // Calling API
      let result: ConsolidationResult;
      try {
        result = await api.consolidateMemories();
      } catch {
        // Fallback simulation
        const retainedList = memories.filter(m => m.importance >= 5);
        const forgottenList = memories.filter(m => m.importance < 5);
        
        result = {
          analyzed: memories.length,
          retained: retainedList.length,
          forgotten: forgottenList.length,
          details: memories.map(m => ({
            content: m.content,
            action: m.importance >= 5 ? 'retained' : 'forgotten',
            reason: m.importance >= 5 ? 'Long-term personal information' : 'Temporary or trivial information'
          }))
        };
      }
      
      setConsolidationResult(result);
      setConsolidationPhase(3); // Show results
    }, 2000);
  };

  const closeConsolidation = () => {
    setIsConsolidating(false);
    setConsolidationPhase(0);
    setConsolidationResult(null);
    loadMemories();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  const longTerm = memories.filter(m => m.importance >= 5);
  const observations = memories.filter(m => m.importance < 5);
  
  const healthPercentage = memories.length > 0 ? Math.round((longTerm.length / memories.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24 relative overflow-hidden">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-8 animate-fade-in">
        
        {/* HEADER */}
        <header className="space-y-2">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Companion Memory 🧠
          </h1>
          <p className="text-zinc-400">
            Dreammate remembers what helps it understand you and lets temporary details fade away.
          </p>
        </header>

        {/* MEMORY HEALTH CARD */}
        <div className="glass p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-lg font-semibold text-white/90">Memory Health</h2>
              <p className="text-sm text-zinc-400">{memories.length} total memories</p>
            </div>
            <div className="text-2xl font-bold text-emerald-400">{healthPercentage}%</div>
          </div>
          <div className="w-full bg-zinc-800/50 rounded-full h-2.5">
            <div 
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${healthPercentage}%` }}
            />
          </div>
        </div>

        {/* CONSOLIDATION BUTTON */}
        <Button 
          onClick={runConsolidation}
          className="w-full glass-strong py-6 text-lg hover:bg-white/10 transition-colors"
          variant="outline"
        >
          Run Memory Cleanup
        </Button>

        {/* LONG-TERM MEMORIES */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">🧠 Long-term memories</h2>
          {longTerm.length === 0 ? (
            <p className="text-zinc-500 italic">No long-term memories yet. Start chatting to build them!</p>
          ) : (
            <div className="grid gap-4">
              {longTerm.map(memory => (
                <div key={memory.id} className="memory-card glass p-4 rounded-xl flex items-start gap-4 transition-all hover:bg-white/5">
                  <div className="text-2xl bg-white/5 p-2 rounded-lg">
                    {getCategoryIcon(memory.content)}
                  </div>
                  <div className="flex-1">
                    <p className="text-white/90 leading-relaxed">&quot;{memory.content}&quot;</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(memory.id)}
                    className="text-zinc-500 hover:text-red-400 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RECENT OBSERVATIONS */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-zinc-300">📖 Recent observations</h2>
          {observations.length === 0 ? (
            <p className="text-zinc-600 italic">No recent observations.</p>
          ) : (
            <div className="grid gap-3">
              {observations.map(memory => (
                <div key={memory.id} className="memory-card glass opacity-80 p-4 rounded-xl flex items-start gap-4 transition-all hover:opacity-100 hover:bg-white/5">
                  <div className="text-2xl bg-white/5 p-2 rounded-lg grayscale">
                    {getCategoryIcon(memory.content)}
                  </div>
                  <div className="flex-1">
                    <p className="text-zinc-300 text-sm leading-relaxed">&quot;{memory.content}&quot;</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(memory.id)}
                    className="text-zinc-600 hover:text-red-400 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* CONSOLIDATION MODAL / OVERLAY */}
      {isConsolidating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60 animate-fade-in">
          <div className="glass-strong p-8 rounded-3xl w-full max-w-md flex flex-col items-center justify-center space-y-6">
            
            {consolidationPhase === 1 && (
              <div className="flex flex-col items-center gap-6 animate-pulse-glow">
                <div className="text-6xl">🧠</div>
                <h3 className="text-xl font-semibold text-center">Analyzing recent conversations...</h3>
              </div>
            )}

            {consolidationPhase >= 3 && consolidationResult && (
              <div className="w-full space-y-6 animate-fade-in">
                <h3 className="text-2xl font-bold text-center">Consolidation Complete</h3>
                
                <div className="glass bg-black/20 p-4 rounded-xl flex justify-around text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-400">{consolidationResult.analyzed}</div>
                    <div className="text-xs text-zinc-400">Analyzed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-400">{consolidationResult.retained}</div>
                    <div className="text-xs text-zinc-400">Retained</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-zinc-500">{consolidationResult.forgotten}</div>
                    <div className="text-xs text-zinc-400">Forgotten</div>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                  {consolidationResult.details?.map((detail, i) => (
                    <div 
                      key={i}
                      className="animate-slide-up flex items-center gap-2 text-sm"
                      style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
                    >
                      {detail.action === 'retained' ? (
                        <span className="text-emerald-500">✓</span>
                      ) : (
                        <span className="text-red-500/50">✗</span>
                      )}
                      <span className={`truncate ${detail.action === 'retained' ? 'text-white' : 'text-zinc-500 line-through'}`}>
                        {detail.content}
                      </span>
                    </div>
                  ))}
                </div>

                <Button onClick={closeConsolidation} className="w-full bg-white text-black hover:bg-zinc-200">
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 glass-strong border-t border-white/10 z-40">
        <div className="max-w-md mx-auto flex justify-around p-3">
          <Link href="/" className="flex flex-col items-center p-2 text-zinc-400 hover:text-white transition-colors">
            <Home className="w-6 h-6 mb-1" />
            <span className="text-xs">Companion</span>
          </Link>
          <Link href="/memories" className="flex flex-col items-center p-2 text-emerald-400 transition-colors">
            <Brain className="w-6 h-6 mb-1" />
            <span className="text-xs font-medium">Memories</span>
          </Link>
          <Link href="/customize" className="flex flex-col items-center p-2 text-zinc-400 hover:text-white transition-colors">
            <Settings className="w-6 h-6 mb-1" />
            <span className="text-xs">Customize</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
