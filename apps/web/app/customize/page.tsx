"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import { Companion3D } from '@/components/Companion3D';
import { api, CompanionData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const primaryColors = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'
];

const eyeColors = [
  '#ffffff', '#60a5fa', '#34d399', '#fbbf24', '#f472b6'
];

const personalities = [
  { id: 'calm', name: 'Calm', icon: '🧘' },
  { id: 'funny', name: 'Funny', icon: '😄' },
  { id: 'energetic', name: 'Energetic', icon: '⚡' },
  { id: 'caring', name: 'Caring', icon: '💖' },
  { id: 'curious', name: 'Curious', icon: '🔍' },
];

export default function CustomizePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  const [name, setName] = useState('DreamMate');
  const [primaryColor, setPrimaryColor] = useState(primaryColors[0]);
  const [eyeColor, setEyeColor] = useState(eyeColors[0]);
  const [hasGlasses, setHasGlasses] = useState(false);
  const [personality, setPersonality] = useState('caring');

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/auth');
          return;
        }
        await api.getMe();
        
        try {
          const comp = await api.getCompanion();
          if (comp) {
            setHasExisting(true);
            setName(comp.name || 'DreamMate');
            if (comp.appearance) {
              const app = comp.appearance as Record<string, unknown>;
              setPrimaryColor(app.primaryColor as string || primaryColors[0]);
              setEyeColor(app.eyeColor as string || eyeColors[0]);
              setHasGlasses(app.hasGlasses as boolean || false);
            }
            setPersonality(comp.personality_style || 'caring');
          }
        } catch (err: unknown) {
          if (err instanceof Error && !err.message.includes('404')) {
            console.error('Error loading companion:', err);
          }
        }
      } catch (err) {
        console.error('Auth error:', err);
        router.push('/auth');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [router]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data: Partial<CompanionData> = {
        name,
        appearance: { primaryColor, hasGlasses, eyeColor },
        personality_style: personality,
        accountability_style: 'balanced',
      };
      
      if (hasExisting) {
        await api.updateCompanion(data);
      } else {
        await api.createCompanion(data as CompanionData);
      }
      
      router.push('/');
    } catch (err) {
      console.error('Failed to save companion:', err);
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white">
        <div className="animate-pulse">Loading customization...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      {/* Header */}
      <header className="flex items-center p-6 lg:px-12 pt-8">
        <Link href="/" className="text-gray-400 hover:text-white transition-colors flex items-center mr-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold">Customize Your Companion</h1>
      </header>

      <main className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col lg:flex-row gap-8 lg:gap-16">
        
        {/* Left: 3D Preview */}
        <div className="lg:w-1/2 flex flex-col animate-fade-in">
          <div className="w-full aspect-square md:aspect-[4/3] lg:aspect-square relative rounded-3xl overflow-hidden glass companion-glow">
            <Canvas camera={{ position: [0, 1.5, 4], fov: 45 }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <Companion3D 
                emotion="happy" 
                appearance={{ primaryColor, hasGlasses, eyeColor }} 
                isSpeaking={false} 
              />
              <Environment preset="city" />
              <ContactShadows position={[0, 0, 0]} opacity={0.5} scale={10} blur={2} far={4} />
            </Canvas>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="lg:w-1/2 flex flex-col gap-6 animate-slide-up glass p-6 md:p-8 rounded-3xl">
          
          {/* Name */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">Companion Name</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="Enter a name..."
            />
          </div>

          {/* Primary Color */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">Primary Color</label>
            <div className="flex flex-wrap gap-3">
              {primaryColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setPrimaryColor(color)}
                  className={`w-10 h-10 rounded-full transition-all ${primaryColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f] scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Eye Color */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">Eye Color</label>
            <div className="flex flex-wrap gap-3">
              {eyeColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setEyeColor(color)}
                  className={`w-10 h-10 rounded-full transition-all ${eyeColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f] scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Select eye color ${color}`}
                />
              ))}
            </div>
          </div>

          {/* Accessories (Glasses) */}
          <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
            <div>
              <p className="font-medium">Glasses</p>
              <p className="text-xs text-gray-400">Add stylish eyewear</p>
            </div>
            <button 
              onClick={() => setHasGlasses(!hasGlasses)}
              className={`w-12 h-6 rounded-full transition-colors relative ${hasGlasses ? 'bg-indigo-500' : 'bg-gray-600'}`}
            >
              <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${hasGlasses ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Personality */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">Personality Style</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {personalities.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersonality(p.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${personality === p.id ? 'bg-indigo-500/20 border-indigo-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                >
                  <span className="text-xl">{p.icon}</span>
                  <span className="text-sm font-medium">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full mt-4 py-6 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Companion'}
          </Button>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full glass-strong border-t border-white/10 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center px-6 py-4">
          <Link href="/" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-medium">Companion</span>
          </Link>
          <Link href="/memories" className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="text-[10px] font-medium">Memories</span>
          </Link>
          <Link href="/customize" className="flex flex-col items-center gap-1 text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[10px] font-medium">Customize</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
