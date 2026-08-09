"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { Companion3D } from '@/components/Companion3D';

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<{role: string, content: string}[]>([
    { role: 'assistant', content: 'Hi there! I am your DreamMate. What are we working on today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [currentIntensity, setCurrentIntensity] = useState(0.5);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    // Give some immediate feedback in the 3D model
    setCurrentEmotion('thinking');

    try {
      const res = await api.chat(userMessage);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
      
      if (res.avatar_emotion) {
        setCurrentEmotion(res.avatar_emotion.emotion);
        setCurrentIntensity(res.avatar_emotion.intensity);
      } else {
        setCurrentEmotion('neutral');
      }
      
      if (res.take_break_suggested) {
        setShowBreakModal(true);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to my brain.' }]);
      setCurrentEmotion('sad');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 flex-col md:flex-row">
      {/* Sidebar for 3D Companion */}
      <div className="w-full md:w-1/3 bg-zinc-900 border-r border-zinc-800 flex flex-col relative overflow-hidden">
        <div className="absolute top-4 left-4 z-10">
          <Button variant="outline" className="border-zinc-700 hover:bg-zinc-800" onClick={() => router.push('/')}>
            ← Back to Map
          </Button>
        </div>
        
        {/* 3D Canvas */}
        <div className="flex-1 w-full h-full">
          <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <Companion3D emotion={currentEmotion} intensity={currentIntensity} />
            <ContactShadows position={[0, -2, 0]} opacity={0.5} scale={10} blur={2} far={4} />
            <Environment preset="city" />
          </Canvas>
        </div>

        <div className="p-8 text-center bg-gradient-to-t from-zinc-900 to-transparent absolute bottom-0 w-full pb-12 pointer-events-none">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            DreamMate
          </h2>
          <p className="text-zinc-400 mt-2 text-sm">Always here to help you achieve your goals.</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full relative">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-100 rounded-tl-sm border border-zinc-700'}`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] p-4 rounded-2xl bg-zinc-800 text-zinc-400 rounded-tl-sm border border-zinc-700 flex items-center gap-2">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse delay-75">●</span>
                <span className="animate-pulse delay-150">●</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-6 bg-zinc-950 border-t border-zinc-800">
          <div className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell me about your progress..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-full px-6 py-4 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <Button type="submit" disabled={loading} className="rounded-full h-auto px-8 bg-blue-600 hover:bg-blue-700">
              Send
            </Button>
          </div>
        </form>

        {/* Break Modal */}
        {showBreakModal && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold mb-4 text-emerald-400">Time for a Break?</h3>
              <p className="text-zinc-300 mb-8">
                We&apos;ve been talking for a while! I care about you, and I don&apos;t want to become the only thing you focus on today. 
                Why don&apos;t you step away and make some real-world progress on your goals?
              </p>
              <div className="flex flex-col gap-3">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => {
                  setShowBreakModal(false);
                  router.push('/dreams');
                }}>
                  🎯 Work on my goal
                </Button>
                <Button variant="outline" className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-300" onClick={() => setShowBreakModal(false)}>
                  ↩️ Continue talking
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
