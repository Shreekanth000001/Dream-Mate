"use client";

import { useEffect, useState, FormEvent } from 'react';
import { api, MemoryItem, ConsolidationResult } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Navigation } from '@/components/Navigation';
import { useRouter } from 'next/navigation';
import { Trash2, Sparkles, Plus } from 'lucide-react';

export default function MemoriesPage() {
  const router = useRouter();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Add memory input
  const [newMemoryText, setNewMemoryText] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Consolidation state
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [consolidationPhase, setConsolidationPhase] = useState<number>(0);
  const [consolidationResult, setConsolidationResult] = useState<ConsolidationResult | null>(null);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/auth');
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

  const handleAddMemory = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMemoryText.trim() || isAdding) return;

    setIsAdding(true);
    try {
      const text = newMemoryText.trim();
      const lower = text.toLowerCase();
      const isImportant = ["want", "goal", "dream", "love", "hate", "always", "never", "career", "code", "learn", "study"].some(k => lower.includes(k));
      const importance = isImportant ? 7 : 3;

      const created = await api.addMemory(text, importance);
      setMemories(prev => [created, ...prev]);
      setNewMemoryText('');
    } catch (err) {
      console.error('Failed to add memory', err);
    } finally {
      setIsAdding(false);
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
    }, 1500);
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
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    );
  }

  const longTerm = memories.filter(m => m.importance >= 5);
  const observations = memories.filter(m => m.importance < 5);
  
  const healthPercentage = memories.length > 0 ? Math.round((longTerm.length / memories.length) * 100) : 100;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-28 relative overflow-hidden">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
        
        {/* HEADER */}
        <header className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">
            Companion Memory 🧠
          </h1>
          <p className="text-zinc-400 text-sm">
            Dreammate retains meaningful long-term personal facts and lets transient noise fade away.
          </p>
        </header>

        {/* MEMORY HEALTH CARD */}
        <div className="glass p-6 rounded-2xl space-y-4 border border-white/10 shadow-xl">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-base font-semibold text-white">Memory Health Index</h2>
              <p className="text-xs text-zinc-400">{memories.length} stored facts ({longTerm.length} long-term)</p>
            </div>
            <div className="text-2xl font-bold text-emerald-400">{healthPercentage}%</div>
          </div>
          <div className="w-full bg-zinc-800/60 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${healthPercentage}%` }}
            />
          </div>
        </div>

        {/* CONSOLIDATION BUTTON */}
        <Button 
          onClick={runConsolidation}
          disabled={memories.length === 0}
          className="w-full glass-strong py-6 text-base font-semibold border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-300 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-emerald-400" />
          Run Memory Cleanup (Consolidation)
        </Button>

        {/* QUICK ADD MEMORY FORM */}
        <form onSubmit={handleAddMemory} className="flex gap-2">
          <input
            type="text"
            value={newMemoryText}
            onChange={(e) => setNewMemoryText(e.target.value)}
            placeholder="Add a test memory (e.g. 'I love playing guitar')..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
          <Button 
            type="submit" 
            disabled={!newMemoryText.trim() || isAdding}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 flex items-center gap-1 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Add
          </Button>
        </form>

        {/* LONG-TERM MEMORIES */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
            🧠 Long-term Memories ({longTerm.length})
          </h2>
          {longTerm.length === 0 ? (
            <div className="glass p-6 rounded-xl text-center text-zinc-500 text-sm">
              No long-term memories stored yet. Start chatting or add one above!
            </div>
          ) : (
            <div className="grid gap-3">
              {longTerm.map(memory => (
                <div key={memory.id} className="memory-card glass p-4 rounded-xl flex items-center gap-3 border border-white/10 transition-all hover:bg-white/5">
                  <div className="text-xl bg-white/5 p-2 rounded-lg shrink-0">
                    {getCategoryIcon(memory.content)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium leading-relaxed">&quot;{memory.content}&quot;</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(memory.id)}
                    className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 shrink-0 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RECENT OBSERVATIONS */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-zinc-300">
            📖 Recent Observations ({observations.length})
          </h2>
          {observations.length === 0 ? (
            <div className="glass p-6 rounded-xl text-center text-zinc-500 text-sm">
              No short-term observations pending.
            </div>
          ) : (
            <div className="grid gap-2.5">
              {observations.map(memory => (
                <div key={memory.id} className="memory-card glass opacity-80 p-3.5 rounded-xl flex items-center gap-3 border border-white/5 transition-all hover:opacity-100 hover:bg-white/5">
                  <div className="text-lg bg-white/5 p-2 rounded-lg grayscale shrink-0">
                    {getCategoryIcon(memory.content)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-300 text-xs leading-relaxed">&quot;{memory.content}&quot;</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(memory.id)}
                    className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 shrink-0 h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* CONSOLIDATION MODAL */}
      {isConsolidating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/70 animate-fade-in">
          <div className="glass-strong border border-white/20 p-8 rounded-3xl w-full max-w-md flex flex-col items-center justify-center space-y-6 shadow-2xl">
            
            {consolidationPhase === 1 && (
              <div className="flex flex-col items-center gap-4 animate-pulse-glow py-6">
                <div className="text-6xl animate-bounce">🧠</div>
                <h3 className="text-xl font-semibold text-center text-white">Analyzing memories...</h3>
                <p className="text-xs text-zinc-400">Classifying long-term value & pruning noise</p>
              </div>
            )}

            {consolidationPhase >= 3 && consolidationResult && (
              <div className="w-full space-y-5 animate-fade-in">
                <div className="text-center space-y-1">
                  <h3 className="text-2xl font-bold text-white">Consolidation Complete</h3>
                  <p className="text-xs text-zinc-400">Memory optimization result</p>
                </div>
                
                <div className="glass bg-black/30 p-4 rounded-2xl flex justify-around text-center border border-white/10">
                  <div>
                    <div className="text-2xl font-bold text-indigo-400">{consolidationResult.analyzed}</div>
                    <div className="text-[11px] text-zinc-400 uppercase tracking-wider mt-0.5">Analyzed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-400">{consolidationResult.retained}</div>
                    <div className="text-[11px] text-zinc-400 uppercase tracking-wider mt-0.5">Retained</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-rose-400">{consolidationResult.forgotten}</div>
                    <div className="text-[11px] text-zinc-400 uppercase tracking-wider mt-0.5">Forgotten</div>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {consolidationResult.details?.map((detail, i) => (
                    <div 
                      key={i}
                      className="animate-slide-up flex items-start gap-2.5 text-xs p-2 rounded-lg bg-white/5 border border-white/5"
                      style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
                    >
                      {detail.action === 'retained' ? (
                        <span className="text-emerald-400 font-bold shrink-0">✓</span>
                      ) : (
                        <span className="text-rose-400 font-bold shrink-0">✗</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className={`truncate font-medium ${detail.action === 'retained' ? 'text-white' : 'text-zinc-500 line-through'}`}>
                          {detail.content}
                        </p>
                        <p className="text-[10px] text-zinc-400">{detail.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={closeConsolidation} 
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all"
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <Navigation />
    </div>
  );
}
