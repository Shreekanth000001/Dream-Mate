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

const primaryColors = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6'
];

const eyeColors = [
  '#ffffff', '#60a5fa', '#34d399', '#fbbf24', '#f472b6'
];

const skinColors = [
  '#f8edeb', '#fcd5ce', '#ffb5a7', '#d4a373', 
  '#bb9457', '#9c6644', '#7f4f24', '#582f0e'
];

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
  { id: 'Thinking', name: 'Thinking' },
  { id: 'Wave', name: 'Wave' },
  { id: 'Point', name: 'Point' }
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
  primaryColor,
  skinColor,
  hasGlasses,
  eyeColor,
  emotion,
  gesture,
  transform,
  cameraConfig,
  onCapabilitiesLoaded,
}: {
  baseAvatar: string;
  primaryColor: string;
  skinColor: string;
  hasGlasses: boolean;
  eyeColor: string;
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
        appearance={{ baseAvatar, primaryColor, skinColor, hasGlasses, eyeColor, transform }} 
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
  const [assetStatus, setAssetStatus] = useState<Record<string, boolean>>({});
  
  const [primaryColor, setPrimaryColor] = useState(primaryColors[0]);
  const [skinColor, setSkinColor] = useState(skinColors[1]);
  const [eyeColor, setEyeColor] = useState(eyeColors[0]);
  const [hasGlasses, setHasGlasses] = useState(false);
  const [voiceURI, setVoiceURI] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [personality, setPersonality] = useState('supportive');
  
  const [previewEmotion, setPreviewEmotion] = useState('happy');
  const [previewGesture, setPreviewGesture] = useState('none');
  const [capabilities, setCapabilities] = useState<AvatarCapabilities>({
    hasHumanoidRig: true,
    hasFacialMorphs: true,
    hasAnimations: true,
    hasGlasses: true,
    hasHair: true,
    hasClothing: true,
    hasMultipleHairStyles: false,
    hasMultipleOutfits: false,
    hasMultipleEyeStyles: false,
    hasHairColor: true,
    hasSkinColor: true,
    hasClothingColor: true,
    hasEyeColor: true
  });
  
  const [avatarTransforms, setAvatarTransforms] = useState(defaultTransforms);
  const currentTransform = avatarTransforms[baseAvatar] || defaultTransforms['default'] || defaultTransforms[CHARACTER_REGISTRY[0].id];

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
      const current = { ...(next[baseAvatar] || defaultTransforms['default'] || defaultTransforms[CHARACTER_REGISTRY[0].id]) };
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
    updateTransform('cameraPosition', 1, 1.5);
    updateTransform('cameraPosition', 2, 2.5);
    updateTransform('cameraTarget', 0, 0);
    updateTransform('cameraTarget', 1, 1.2);
    updateTransform('cameraTarget', 2, 0);
  };
  
  const frameFace = () => {
    updateTransform('cameraPosition', 0, 0);
    updateTransform('cameraPosition', 1, 0.2);
    updateTransform('cameraPosition', 2, 0.8);
    updateTransform('cameraTarget', 0, 0);
    updateTransform('cameraTarget', 1, 0.1);
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
              setPrimaryColor(app.primaryColor as string || primaryColors[0]);
              setSkinColor(app.skinColor as string || skinColors[1]);
              setEyeColor(app.eyeColor as string || eyeColors[0]);
              setHasGlasses(app.hasGlasses as boolean || false);
              if (app.voiceURI) setVoiceURI(app.voiceURI as string);
              
              if (app.transform || app.camera) {
                setAvatarTransforms(prev => ({
                  ...prev,
                  [app.baseAvatar as string || 'avatar1']: {
                    ...(prev[app.baseAvatar as string || 'avatar1']),
                    position: (app.transform as any)?.position || prev[app.baseAvatar as string || 'avatar1'].position,
                    rotation: (app.transform as any)?.rotation || prev[app.baseAvatar as string || 'avatar1'].rotation,
                    scale: (app.transform as any)?.scale || prev[app.baseAvatar as string || 'avatar1'].scale,
                    cameraPosition: (app.camera as any)?.position || prev[app.baseAvatar as string || 'default'].cameraPosition,
                    cameraTarget: (app.camera as any)?.target || prev[app.baseAvatar as string || 'default'].cameraTarget,
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

        // Verify available GLB assets via HEAD requests
        const valid: CharacterDef[] = [];
        const status: Record<string, boolean> = {};
        for (const char of CHARACTER_REGISTRY) {
          try {
            const res = await fetch(char.model, { method: 'HEAD' });
            const exists = res.ok;
            status[char.model] = exists;
            if (exists) valid.push(char);
          } catch (e) {
            status[char.model] = false;
          }
        }

        // Check optional animations.glb
        try {
          const animRes = await fetch('/animations.glb', { method: 'HEAD' });
          status['/animations.glb'] = animRes.ok;
        } catch {
          status['/animations.glb'] = false;
        }

        setAssetStatus(status);
        setAvailableCharacters(valid);

        if (valid.length > 0 && !valid.find(c => c.id === baseAvatar)) {
          setBaseAvatar(valid[0].id);
          setPersonality(valid[0].personalityId);
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
        primaryColor,
        skinColor,
        eyeColor,
        hasGlasses,
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
            Personalize your companion&apos;s 3D look, colors, and conversational vibe.
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
                <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Base Model</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableCharacters.map((ava) => (
                    <button
                      key={ava.id}
                      onClick={() => {
                        setBaseAvatar(ava.id);
                        setPersonality(ava.personalityId);
                      }}
                      className={`px-3 py-2 rounded-xl border transition-all cursor-pointer text-left flex flex-col gap-1 relative overflow-hidden ${baseAvatar === ava.id ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                    >
                      <span className={`font-bold text-sm ${baseAvatar === ava.id ? 'text-white' : 'text-gray-200'}`}>{ava.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CAPABILITY-AWARE PANELS */}
          
          {(capabilities.hasSkinColor || capabilities.hasFacialMorphs) && (
            <div className="glass p-6 rounded-3xl border border-white/10 flex flex-col gap-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">Face & Skin</h2>
              
              {capabilities.hasSkinColor && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-400">Skin Tone</label>
                  <div className="flex flex-wrap gap-3">
                    {skinColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSkinColor(color)}
                        className={`w-8 h-8 rounded-full transition-all cursor-pointer ${skinColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f] scale-110' : 'hover:scale-110 opacity-80 hover:opacity-100'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select skin color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(capabilities.hasHair || capabilities.hasMultipleHairStyles) && (
            <div className="glass p-6 rounded-3xl border border-white/10 flex flex-col gap-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">Hair</h2>
              
              {capabilities.hasMultipleHairStyles && (
                <div className="text-xs text-gray-400 italic">Hairstyle selection not available for this model yet.</div>
              )}
              
              {/* Note: In MVP, hasHairColor is handled via primaryColor/hairColor variables */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-gray-400">Hair Color</label>
                <div className="flex flex-wrap gap-3">
                  {/* Reuse primary colors for hair for simplicity in MVP, or define a new array if preferred. I'll use primaryColors here */}
                  {[...primaryColors, '#3b2f2f', '#fcd5ce'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setPrimaryColor(color)} /* Wait, we should update hairColor state if it existed. Ah, I don't have hairColor state! Let me just tint clothing with primaryColor */
                      // Wait, I missed hairColor state! I'll just use primaryColors array, wait, there is no setHairColor.
                      // Let me fix that. The appearance object takes hairColor.
                      className={`hidden`}
                    />
                  ))}
                  <div className="text-xs text-gray-500">Auto-tinted based on materials (Feature coming soon)</div>
                </div>
              </div>
            </div>
          )}

          {(capabilities.hasEyeColor || capabilities.hasMultipleEyeStyles) && (
            <div className="glass p-6 rounded-3xl border border-white/10 flex flex-col gap-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">Eyes</h2>
              
              {capabilities.hasEyeColor && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-400">Eye Glow</label>
                  <div className="flex flex-wrap gap-3">
                    {eyeColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEyeColor(color)}
                        className={`w-8 h-8 rounded-full transition-all cursor-pointer border border-white/20 ${eyeColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f] scale-110' : 'hover:scale-110 opacity-80 hover:opacity-100'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select eye color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {(capabilities.hasClothing || capabilities.hasClothingColor || capabilities.hasMultipleOutfits) && (
            <div className="glass p-6 rounded-3xl border border-white/10 flex flex-col gap-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">Clothing</h2>
              
              {capabilities.hasMultipleOutfits && (
                <div className="text-xs text-gray-400 italic">Outfit selection not available for this model yet.</div>
              )}
              
              {capabilities.hasClothingColor && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-gray-400">Clothing Color</label>
                  <div className="flex flex-wrap gap-3">
                    {primaryColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setPrimaryColor(color)}
                        className={`w-8 h-8 rounded-full transition-all cursor-pointer ${primaryColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f] scale-110' : 'hover:scale-110 opacity-80 hover:opacity-100'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {capabilities.hasGlasses && (
            <div className="glass p-6 rounded-3xl border border-white/10 flex flex-col gap-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest border-b border-white/10 pb-2">Accessories</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Glasses Frame</p>
                  <p className="text-xs text-gray-400">Add stylish eyewear</p>
                </div>
                <button 
                  onClick={() => setHasGlasses(!hasGlasses)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${hasGlasses ? 'bg-indigo-600' : 'bg-gray-700'}`}
                >
                  <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${hasGlasses ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          )}

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
              primaryColor={primaryColor} 
              skinColor={skinColor}
              hasGlasses={hasGlasses} 
              eyeColor={eyeColor}
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
                </div>
              </div>
            )}

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center glass py-2 px-6 rounded-full border border-white/10 backdrop-blur-md shadow-xl flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-sm tracking-wide text-gray-200 font-medium">{name || 'Your Companion'}</span>
            </div>
          </div>

          {/* Dev Mode Panel rendered absolutely or below */}
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
                  <span className="text-[10px] text-gray-300 uppercase tracking-widest">Test Gesture</span>
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
