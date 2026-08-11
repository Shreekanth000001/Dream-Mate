"use client";

import React, { useEffect, useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { Companion3D } from "@/components/Companion3D";
import { Navigation } from "@/components/Navigation";
import { api, ChatResponse, CompanionData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { CHARACTER_REGISTRY } from "@/lib/characters";
import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function CameraController({ position, target }: { position: [number, number, number], target: [number, number, number] }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(...target);
  }, [position, target, camera]);
  
  return <OrbitControls target={target} enableZoom={true} enablePan={false} maxPolarAngle={Math.PI / 2 + 0.1} minPolarAngle={Math.PI / 2 - 0.5} />;
}

// Memoized 3D Stage component prevents 3D canvas re-renders on chat input typing
const CompanionStage = React.memo(function CompanionStage({
  companion,
  emotion,
  emoji,
  isSpeaking,
  gesture,
}: {
  companion: CompanionData | null;
  emotion: string;
  emoji: string;
  isSpeaking: boolean;
  gesture: string;
}) {
  if (!companion) return null;

  const appearanceObj = (companion.appearance || {}) as Record<string, unknown>;
  const baseAvatar = (appearanceObj.baseAvatar as string) || "boy";
  
  // Resolve default transforms for current character
  const character = CHARACTER_REGISTRY.find(c => c.id === baseAvatar) || CHARACTER_REGISTRY[0];
  const fallbackTransform = character?.defaultTransform || { position: [0, -1.4, 0], rotation: [0, 0, 0], scale: 1.0, cameraPosition: [0, 1.4, 1.2], cameraTarget: [0, 1.4, 0] };
  
  const savedTransform = appearanceObj.transform as { position: [number, number, number]; rotation: [number, number, number]; scale: number } | undefined;
  const savedCamera = appearanceObj.camera as { position: [number, number, number]; target: [number, number, number] } | undefined;
  
  const cameraPos = savedCamera?.position || fallbackTransform.cameraPosition;
  const cameraTgt = savedCamera?.target || fallbackTransform.cameraTarget;
  const transform = savedTransform || fallbackTransform;

  return (
    <Canvas camera={{ position: cameraPos, fov: 35 }}>
      <CameraController position={cameraPos} target={cameraTgt} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} />
      <directionalLight position={[-5, -2, -5]} intensity={0.4} />
      <Companion3D 
        emotion={emotion} 
        emoji={emoji}
        appearance={{
          baseAvatar,
          transform,
        }} 
        isSpeaking={isSpeaking} 
        gesture="wave"
      />
      <ContactShadows position={[0, -0.8, 0]} opacity={0.4} scale={10} blur={2} far={4} color="#000000" />
    </Canvas>
  );
});

export default function HomePage() {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [companion, setCompanion] = useState<CompanionData | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Companion state
  const [emotion, setEmotion] = useState("neutral");
  const [gesture, setGesture] = useState("none");
  const [emoji, setEmoji] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Toggle states
  const [isAvatarMode, setIsAvatarMode] = useState(true);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

  useEffect(() => {
    const savedAvatarMode = localStorage.getItem('isAvatarMode');
    const savedVoiceMode = localStorage.getItem('isVoiceEnabled');
    if (savedAvatarMode !== null) setIsAvatarMode(savedAvatarMode === 'true');
    if (savedVoiceMode !== null) setIsVoiceEnabled(savedVoiceMode === 'true');
  }, []);

  const toggleAvatarMode = () => {
    const next = !isAvatarMode;
    setIsAvatarMode(next);
    localStorage.setItem('isAvatarMode', String(next));
  };

  const toggleVoiceMode = () => {
    const next = !isVoiceEnabled;
    setIsVoiceEnabled(next);
    localStorage.setItem('isVoiceEnabled', String(next));
    if (!next && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const replayLastMessage = () => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant' && !m.content.startsWith('⚠️'));
    if (lastAssistantMessage && isVoiceEnabled) {
      speakText(lastAssistantMessage.content);
    }
  };

  // Session & Break state
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showBreakOverlay, setShowBreakOverlay] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth");
        return;
      }

      try {
        await api.getMe();
        const companionData = await api.getCompanion();
        setCompanion(companionData);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : '';
        if (errMsg.includes("404")) {
          router.push("/customize");
        } else {
          router.push("/auth");
        }
      } finally {
        setIsAuthChecking(false);
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    if (isAuthChecking) return;

    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthChecking]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue((prev) => prev + (prev ? " " : "") + transcript);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const speakText = (text: string) => {
    if (!isVoiceEnabled) return;
    try {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      const appearanceObj = (companion?.appearance || {}) as Record<string, unknown>;
      const voiceURI = appearanceObj.voiceURI as string;
      if (voiceURI) {
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        setEmotion("neutral");
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setEmotion("neutral");
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis failed or blocked by browser policy
    }
  };

  const formatSessionTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSendMessage = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsSending(true);

    try {
      const response: ChatResponse = await api.chat(userMessage);
      
      if (response.avatar_emotion) {
        setEmotion(response.avatar_emotion.emotion || "neutral");
      }
      
      if (response.avatar_gesture) {
        setGesture(response.avatar_gesture.gesture || "none");
      }

      if (response.emoji) {
        setEmoji(response.emoji);
      }
      
      if (response.take_break_suggested) {
        setShowBreakOverlay(true);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
      
      if (response.shouldSpeak !== false) {
        speakText(response.reply);
      }
    } catch (err: unknown) {
      console.error("Failed to send message:", err);
      const errorMessage = err instanceof Error ? err.message : "I'm having trouble connecting right now.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${errorMessage}` },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleBreakChoice = (activity: string) => {
    setShowBreakOverlay(false);
    const choiceReply = `That sounds wonderful! Go enjoy your break doing ${activity}. I'll be right here whenever you come back. Take your time! 🌿`;
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: choiceReply }
    ]);
    speakText(choiceReply);
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Speech recognition error:", err);
      }
    }
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex gap-2">
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0a0a0f] text-gray-100 flex flex-col font-sans overflow-hidden relative">
      
      {/* Global Toggles */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <button onClick={() => router.push('/customize')} className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-xs flex items-center gap-1 text-gray-300 hover:text-white" title="Customize companion">
          🎨 Customize
        </button>
        {isVoiceEnabled && isSpeaking && (
          <button onClick={stopSpeaking} className="p-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full hover:bg-red-500/30 transition-all text-xs flex items-center gap-1" title="Stop speaking">
            <span>⏹</span>
          </button>
        )}
        <button onClick={replayLastMessage} className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-all text-xs" title="Replay last message" disabled={messages.length === 0}>
          🔄
        </button>
        <button onClick={toggleVoiceMode} className={`p-2 border rounded-full transition-all text-xs flex items-center gap-1 ${isVoiceEnabled ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
          {isVoiceEnabled ? '🔊 Voice' : '🔈 Voice'}
        </button>
        <div className="w-px h-6 bg-white/20 mx-1"></div>
        <button onClick={toggleAvatarMode} className={`p-2 border rounded-full transition-all text-xs flex items-center gap-1 ${isAvatarMode ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-white/5 border-white/10 text-gray-400'}`}>
          {isAvatarMode ? '👤 Avatar' : '📝 Text'}
        </button>
      </div>

      {/* Main Grid: Left 3D Stage, Right Chat Column */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden pb-16 pt-14 lg:pt-0">
        
        {/* LEFT: Companion 3D Stage */}
        {isAvatarMode && (
        <div className="w-full lg:w-[45%] h-[40vh] lg:h-full relative flex flex-col items-center justify-center companion-glow border-b lg:border-b-0 lg:border-r border-white/10 z-10 bg-gradient-to-b from-[#0f0f1a] to-[#0a0a0f] shrink-0">
          
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-300 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-md border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Session: {formatSessionTime(sessionSeconds)}
            </div>

            <button
              onClick={() => setShowBreakOverlay(true)}
              className="text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-full backdrop-blur-md transition-all hover:scale-105"
            >
              Trigger Break 🌳
            </button>
          </div>

          <div className="w-full h-full absolute inset-0">
            <CompanionStage 
              companion={companion} 
              emotion={emotion} 
              emoji={emoji}
              isSpeaking={isSpeaking} 
              gesture={gesture}
            />
          </div>
          
          <div className="absolute bottom-4 left-0 right-0 text-center z-20 pointer-events-none">
            <h1 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 drop-shadow-md">
              {companion?.name || "DreamMate"}
            </h1>
            <div className="mt-1 inline-block px-3 py-0.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-full text-[11px] font-medium tracking-wide text-indigo-200 uppercase">
              {companion?.personality_style ? `${companion.personality_style} VIBE` : "SUPPORTIVE AI"}
            </div>
          </div>
        </div>
        )}

        {/* RIGHT: Flexbox Chat Column */}
        <div className={`w-full flex-1 flex flex-col bg-[#0a0a0f] relative z-10 overflow-hidden ${isAvatarMode ? 'lg:w-[55%] lg:h-full' : 'h-full'}`}>
          
          {/* Scrollable Messages Window */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex w-full animate-slide-up ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[88%] md:max-w-[78%] p-3.5 md:p-4 text-sm md:text-[15px] leading-relaxed shadow-lg ${
                    msg.role === "user" 
                      ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm" 
                      : "glass text-gray-100 rounded-2xl rounded-tl-sm border border-white/10"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isSending && (
              <div className="flex w-full justify-start animate-fade-in">
                <div className="p-3.5 glass rounded-2xl rounded-tl-sm flex gap-2 items-center">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Sticky Input Bar at Bottom of Chat Column */}
          <div className="shrink-0 p-3 md:p-4 bg-[#0a0a0f] border-t border-white/10 z-20">
            <form 
              onSubmit={handleSendMessage} 
              className="flex items-center gap-2 bg-[#141422] border border-white/15 p-2 rounded-full shadow-2xl max-w-3xl mx-auto"
            >
              <button
                type="button"
                onClick={toggleRecording}
                className={`p-2.5 rounded-full transition-colors shrink-0 ${
                  isRecording ? "bg-red-500/20 text-red-400 animate-pulse" : "hover:bg-white/10 text-gray-400 hover:text-white"
                }`}
                title={isRecording ? "Stop recording" : "Voice input"}
              >
                🎤
              </button>
              
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Message ${companion?.name || "your companion"}...`}
                className="flex-1 bg-transparent border-none outline-none text-gray-100 placeholder-gray-500 px-3 py-1.5 text-sm md:text-base"
                disabled={isSending}
              />
              
              <Button 
                type="submit" 
                disabled={!inputValue.trim() || isSending}
                className="rounded-full h-9 w-9 p-0 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 transition-transform active:scale-95 disabled:opacity-40"
              >
                ↑
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* FIXED BOTTOM NAVIGATION */}
      <Navigation />

      {/* HEALTHY OFFLINE BREAK OVERLAY */}
      {showBreakOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 break-gradient backdrop-blur-xl bg-black/70 animate-fade-in">
          <div className="max-w-md w-full glass-strong border border-white/20 p-8 rounded-3xl text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="w-14 h-14 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                🌿
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Time for a breather</h2>
              <p className="text-gray-200 text-base mb-3 leading-relaxed">
                &ldquo;We&apos;ve been chatting for a while! I love spending time with you, but real-life connections and offline moments matter most.&rdquo;
              </p>
              <p className="text-gray-400 text-xs mb-6">
                Pick a healthy offline activity below:
              </p>
              
              <div className="space-y-2.5">
                <button 
                  onClick={() => handleBreakChoice("going outside for fresh air")}
                  className="w-full py-3.5 px-5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium flex items-center gap-3 transition-all hover:scale-[1.02] text-left"
                >
                  <span className="text-2xl">🌳</span> Go outside & get fresh air
                </button>
                <button 
                  onClick={() => handleBreakChoice("texting or calling a real friend")}
                  className="w-full py-3.5 px-5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium flex items-center gap-3 transition-all hover:scale-[1.02] text-left"
                >
                  <span className="text-2xl">💬</span> Reach out to a real friend
                </button>
                <button 
                  onClick={() => handleBreakChoice("doing a creative hobby")}
                  className="w-full py-3.5 px-5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium flex items-center gap-3 transition-all hover:scale-[1.02] text-left"
                >
                  <span className="text-2xl">🎨</span> Work on a creative hobby
                </button>
                <button 
                  onClick={() => handleBreakChoice("listening to relaxing music")}
                  className="w-full py-3.5 px-5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium flex items-center gap-3 transition-all hover:scale-[1.02] text-left"
                >
                  <span className="text-2xl">🎵</span> Listen to relaxing music
                </button>
              </div>
              
              <button 
                onClick={() => setShowBreakOverlay(false)}
                className="mt-5 text-gray-400 hover:text-gray-200 text-xs underline-offset-4 hover:underline transition-all"
              >
                Continue chatting for a bit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
