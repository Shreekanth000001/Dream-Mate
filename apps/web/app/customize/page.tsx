"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useThree } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Companion3D, AvatarCapabilities } from '@/components/Companion3D';
import { Navigation } from '@/components/Navigation';
import { api, CompanionData } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { CHARACTER_REGISTRY, CharacterDef } from '@/lib/characters';

const expressions = [
  { id: 'neutral', name: 'Neutral', emoji: '😐' },
  { id: 'happy', name: 'Happy', emoji: '😊' },
  { id: 'excited', name: 'Excited', emoji: '🤩' },
  { id: 'sad', name: 'Sad', emoji: '😔' },
  { id: 'concerned', name: 'Concerned', emoji: '😟' },
  { id: 'surprised', name: 'Surprised', emoji: '😮' },
  { id: 'thinking', name: 'Thinking', emoji: '🤔' }
];

const gestures = [
  { id: 'none', name: 'Idle' },
  { id: 'Talking', name: 'Talking' },
  { id: 'Thinking', name: 'Thinking' }
];

const defaultTransforms: Record<string, { position: [number, number, number], rotation: [number, number, number], scale: number, cameraPosition: [number, number, number], cameraTarget: [number, number, number] }> = {};
CHARACTER_REGISTRY.forEach(c => {
  defaultTransforms[c.id] = c.defaultTransform;
});

function CameraController({ position, target }: { position: [number, number, number], target: [number, number, number] }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(...target);
  }, [position, target, camera]);
  
  return <OrbitControls target={target} enableZoom={true} />;
}

const CustomizePreviewStage = React.memo(function CustomizePreviewStage({
  baseAvatar,
  emotion,
  gesture,
  transform,
  cameraConfig,
  onCapabilitiesLoaded,
}: {
  baseAvatar: string;
  emotion: string;
  gesture: string;
  transform: { position: [number, number, number]; rotation: [number, number, number]; scale: number };
  cameraConfig: { position: [number, number, number]; target: [number, number, number] };
  onCapabilitiesLoaded: (caps: AvatarCapabilities) => void;
}) {
  return (
    <Canvas camera={{ position: cameraConfig.position, fov: 35 }}>
      <CameraController position={cameraConfig.position} target={cameraConfig.target} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} />
      <directionalLight position={[-5, -2, -5]} intensity={0.4} />
      <Companion3D 
        emotion={emotion}
        gesture={gesture}
        emoji={expressions.find(e => e.id === emotion)?.emoji}
        appearance={{ baseAvatar, transform }} 
        isSpeaking={gesture === 'Talking'} 
        onCapabilitiesLoaded={onCapabilitiesLoaded}
      />
      <ContactShadows position={[0, -0.8, 0]} opacity={0.4} scale={10} blur={2} far={4} color="#000000" />
    </Canvas>
  );
});

export default function CustomizePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  const [name, setName] = useState('DreamMate');
  const [baseAvatar, setBaseAvatar] = useState(CHARACTER_REGISTRY[0].id);
  const [availableCharacters, setAvailableCharacters] = useState<CharacterDef[]>([]);
  const [isDevMode, setIsDevMode] = useState(false);
  
  const [voiceURI, setVoiceURI] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [personality, setPersonality] = useState('supportive');
  
  const [previewEmotion, setPreviewEmotion] = useState('happy');
  const [previewGesture, setPreviewGesture] = useState('none');
  const [capabilities, setCapabilities] = useState<AvatarCapabilities>({
    hasHumanoidRig: false,
    hasFacialMorphs: false,
  });
  
  const [avatarTransforms, setAvatarTransforms] = useState(defaultTransforms);
  const currentTransform = avatarTransforms[baseAvatar] || defaultTransforms['boy'] || defaultTransforms[CHARACTER_REGISTRY[0].id];

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        setVoices(window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en')));
      };
      window.speechSynthesis.onvoiceschanged = updateVoices;
      updateVoices();
    }
  }, []);

  const updateTransform = (key: string, index: number | null, value: number) => {
    setAvatarTransforms(prev => {
      const next = { ...prev };
      const current = { ...(next[baseAvatar] || defaultTransforms['boy'] || defaultTransforms[CHARACTER_REGISTRY[0].id]) };
      if (key === 'scale') {
        current.scale = value;
      } else {
        const arr = [...(current as any)[key]] as [number, number, number];
        if (index !== null) arr[index] = value;
        (current as any)[key] = arr;
      }
      next[baseAvatar] = current;
      return next;
    });
  };

  const resetCamera = () => {
    updateTransform('cameraPosition', 0, 0);
    updateTransform('cameraPosition', 1, 1.4);
    updateTransform('cameraPosition', 2, 1.2);
    updateTransform('cameraTarget', 0, 0);
    updateTransform('cameraTarget', 1, 1.4);
    updateTransform('cameraTarget', 2, 0);
  };
  
  const frameFace = () => {
    updateTransform('cameraPosition', 0, 0);
    updateTransform('cameraPosition', 1, 1.4);
    updateTransform('cameraPosition', 2, 0.6);
    updateTransform('cameraTarget', 0, 0);
    updateTransform('cameraTarget', 1, 1.45);
    updateTransform('cameraTarget', 2, 0);
  };

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
              if (app.baseAvatar) setBaseAvatar(app.baseAvatar as string);
              if (app.voiceURI) setVoiceURI(app.voiceURI as string);
              
              if (app.transform || app.camera) {
                setAvatarTransforms(prev => ({
                  ...prev,
                  [app.baseAvatar as string || 'boy']: {
                    ...(prev[app.baseAvatar as string || 'boy']),
                    position: (app.transform as any)?.position || prev[app.baseAvatar as string || 'boy'].position,
                    rotation: (app.transform as any)?.rotation || prev[app.baseAvatar as string || 'boy'].rotation,
                    scale: (app.transform as any)?.scale || prev[app.baseAvatar as string || 'boy'].scale,
                    cameraPosition: (app.camera as any)?.position || prev[app.baseAvatar as string || 'boy'].cameraPosition,
                    cameraTarget: (app.camera as any)?.target || prev[app.baseAvatar as string || 'boy'].cameraTarget,
                  }
                }));
              }
            }
            setPersonality(comp.personality_style || 'supportive');
          }
        } catch (err: unknown) {
          if (err instanceof Error && !err.message.includes('404')) {
            console.error('Error loading companion:', err);
          }
        }

        setAvailableCharacters(CHARACTER_REGISTRY);

        if (CHARACTER_REGISTRY.length > 0 && !CHARACTER_REGISTRY.find(c => c.id === baseAvatar)) {
          setBaseAvatar(CHARACTER_REGISTRY[0].id);
          setPersonality(CHARACTER_REGISTRY[0].personalityId);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to init:', err);
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
      const appearance: Record<string, unknown> = {
        baseAvatar,
        voiceURI,
        transform: {
          position: currentTransform.position,
          rotation: currentTransform.rotation,
          scale: currentTransform.scale,
        },
        camera: {
          position: currentTransform.cameraPosition,
          target: currentTransform.cameraTarget,
        }
      };
      
      const data: Partial<CompanionData> = {
        name,
        appearance,
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
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-28">
      <header className="p-6 lg:px-12 pt-8 flex justify-between items-center max-w-[1400px] mx-auto">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Character Studio 🎨
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Choose your companion and voice.
          </p>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col-reverse lg:flex-row gap-8 lg:gap-12">
        
        {/* LEFT: Customization Controls */}
        <div className="lg:w-[400px] flex-shrink-0 flex flex-col gap-6 animate-slide-up h-[calc(100vh-140px)] overflow-y-auto pr-4 custom-scrollbar">
          
          <div className="glass p-6 rounded-3xl border border-white/10 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Companion Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all text-base"
                placeholder="Enter companion name..."
              />
            </div>
            
            {availableCharacters.length > 1 && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Companion Character</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableCharacters.map((ava) => (
                    <button
                      key={ava.id}
                      onClick={() => {
                        setBaseAvatar(ava.id);
                        setPersonality(ava.personalityId);
                      }}
                      className={`px-3 py-3 rounded-xl border transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-1 relative overflow-hidden ${baseAvatar === ava.id ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                    >
                      <span className={`font-bold text-base ${baseAvatar === ava.id ? 'text-white' : 'text-gray-200'}`}>{ava.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="glass p-6 rounded-3xl border border-white/10 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">Voice</h2>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-400">Companion Voice</label>
              {voices.length > 0 ? (
                <select 
                  value={voiceURI} 
                  onChange={(e) => setVoiceURI(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-sm"
                >
                  <option value="">Default System Voice</option>
                  {voices.map(v => (
                    <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>
                  ))}
                </select>
              ) : (
                <div className="text-xs text-gray-500">Loading system voices...</div>
              )}
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full py-6 text-base font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-600/25 cursor-pointer mt-2"
          >
            {isSaving ? 'Saving...' : 'Save & Continue'}
          </Button>

          <button onClick={() => setIsDevMode(!isDevMode)} className="text-xs text-gray-500 hover:text-indigo-400 transition-colors w-full text-center mt-4">
             {isDevMode ? "Hide Developer Tools" : "🛠️ Show Developer Tools"}
          </button>
        </div>

        {/* RIGHT: Large 3D Preview */}
        <div className="flex-1 flex flex-col gap-4 animate-fade-in relative">
          <div className="w-full h-[calc(100vh-140px)] relative rounded-[2rem] overflow-hidden glass companion-glow border border-white/10 bg-gradient-to-b from-[#0f0f1a] to-[#0a0a0f]">
            <CustomizePreviewStage 
              baseAvatar={baseAvatar}
              emotion={previewEmotion}
              gesture={previewGesture}
              transform={currentTransform}
              cameraConfig={{ position: currentTransform.cameraPosition, target: currentTransform.cameraTarget }}
              onCapabilitiesLoaded={setCapabilities}
            />

            {isDevMode && (
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                <div className="bg-indigo-900/60 border border-indigo-500/30 text-indigo-200 text-[10px] font-mono px-3 py-1.5 rounded backdrop-blur-md">
                  {(() => { const c = CHARACTER_REGISTRY.find(ch => ch.id === baseAvatar); return c ? c.model : baseAvatar; })()}
                  {capabilities.hasHumanoidRig ? ' | VRM Rig Detected' : ''}
                </div>
              </div>
            )}

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center glass py-2 px-6 rounded-full border border-white/10 backdrop-blur-md shadow-xl flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-sm tracking-wide text-gray-200 font-medium">{name || 'Your Companion'}</span>
            </div>
          </div>

          {/* Dev Mode Panel */}
          {isDevMode && (
             <div className="absolute top-4 left-4 w-64 flex flex-col gap-4 p-4 border border-indigo-500/30 bg-indigo-900/80 backdrop-blur-xl rounded-xl z-10 text-white">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] text-gray-300 uppercase tracking-widest">Test Emotion</span>
                  <div className="flex flex-wrap gap-1">
                    {expressions.map((exp) => (
                      <button
                        key={exp.id}
                        onClick={() => setPreviewEmotion(exp.id)}
                        className={`px-2 py-1 rounded text-xs transition-all cursor-pointer border ${previewEmotion === exp.id ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}
                      >
                        {exp.emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-1">
                  <span className="text-[10px] text-gray-300 uppercase tracking-widest">Test Gesture/Animation</span>
                  <div className="flex flex-wrap gap-1">
                    {gestures.map((ges) => (
                      <button
                        key={ges.id}
                        onClick={() => setPreviewGesture(ges.id)}
                        className={`px-2 py-1 rounded text-xs transition-all cursor-pointer border ${previewGesture === ges.id ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}`}
                      >
                        {ges.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-indigo-500/20 pt-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                     <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Transform</span>
                     <div className="flex gap-1">
                       <button onClick={frameFace} className="bg-indigo-600 hover:bg-indigo-500 text-[9px] px-2 py-1 rounded cursor-pointer transition-colors">Frame Face</button>
                       <button onClick={resetCamera} className="bg-white/10 hover:bg-white/20 text-[9px] px-2 py-1 rounded cursor-pointer transition-colors">Reset</button>
                     </div>
                   </div>
                  
                  {/* Transform sliders */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-gray-400">Position (X, Y, Z)</span>
                    <div className="flex gap-1">
                      <input type="range" min="-5" max="5" step="0.1" value={currentTransform.position[0]} onChange={(e) => updateTransform('position', 0, parseFloat(e.target.value))} className="w-1/3 accent-indigo-500" />
                      <input type="range" min="-5" max="5" step="0.1" value={currentTransform.position[1]} onChange={(e) => updateTransform('position', 1, parseFloat(e.target.value))} className="w-1/3 accent-indigo-500" />
                      <input type="range" min="-5" max="5" step="0.1" value={currentTransform.position[2]} onChange={(e) => updateTransform('position', 2, parseFloat(e.target.value))} className="w-1/3 accent-indigo-500" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-gray-400">Camera Target (X, Y, Z)</span>
                    <div className="flex gap-1">
                      <input type="range" min="-5" max="5" step="0.1" value={currentTransform.cameraTarget[0]} onChange={(e) => updateTransform('cameraTarget', 0, parseFloat(e.target.value))} className="w-1/3 accent-pink-500" />
                      <input type="range" min="-5" max="5" step="0.1" value={currentTransform.cameraTarget[1]} onChange={(e) => updateTransform('cameraTarget', 1, parseFloat(e.target.value))} className="w-1/3 accent-pink-500" />
                      <input type="range" min="-5" max="5" step="0.1" value={currentTransform.cameraTarget[2]} onChange={(e) => updateTransform('cameraTarget', 2, parseFloat(e.target.value))} className="w-1/3 accent-pink-500" />
                    </div>
                  </div>
                </div>
             </div>
          )}
        </div>

      </main>

      <Navigation />
    </div>
  );
}
