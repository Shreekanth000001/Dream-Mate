"use client";

import { useEffect, useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import { Companion3D } from "@/components/Companion3D";
import { api, ChatResponse, CompanionData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function HomePage() {
  const router = useRouter();
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [companion, setCompanion] = useState<CompanionData | null>(null);
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey! I'm glad you're here. How are you doing today?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Companion state
  const [emotion, setEmotion] = useState("neutral");
  const [isSpeaking, setIsSpeaking] = useState(false);

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
      setSessionSeconds((prev) => {
        const next = prev + 1;
        // Trigger break overlay if session > 120 seconds for demo
        if (next > 120 && !showBreakOverlay) {
          setShowBreakOverlay(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthChecking, showBreakOverlay]);

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
      
      if (response.take_break_suggested) {
        setShowBreakOverlay(true);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
      
      if (response.shouldSpeak !== false) {
        setIsSpeaking(true);
        // Simulate speaking duration based on length of response
        const speakDuration = Math.min(Math.max(response.reply.length * 50, 2000), 10000);
        setTimeout(() => {
          setIsSpeaking(false);
          setEmotion("neutral");
        }, speakDuration);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I'm having trouble connecting right now." },
      ]);
    } finally {
      setIsSending(false);
    }
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
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100 flex flex-col font-sans overflow-hidden h-screen">
      <div className="flex-1 flex flex-col lg:flex-row pb-16 lg:pb-0 overflow-hidden relative">
        
        {/* LEFT: Companion Area */}
        <div className="w-full lg:w-[40%] h-[50vh] lg:h-full relative flex flex-col items-center justify-center companion-glow border-b lg:border-b-0 lg:border-r border-white/10 z-10">
          
          <div className="absolute top-6 left-6 z-20 flex items-center gap-2 text-sm text-gray-400 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Session: {formatSessionTime(sessionSeconds)}
          </div>

          <div className="w-full h-full absolute inset-0">
            <Canvas camera={{ position: [0, 1.5, 4], fov: 45 }}>
              <Environment preset="city" />
              {companion && (
                <Companion3D 
                  emotion={emotion} 
                  appearance={{
                    primaryColor: (companion.appearance as Record<string, unknown>)?.primaryColor as string || "#6366f1",
                    hasGlasses: (companion.appearance as Record<string, unknown>)?.hasGlasses as boolean || false,
                    eyeColor: (companion.appearance as Record<string, unknown>)?.eyeColor as string || "#3b82f6"
                  }} 
                  isSpeaking={isSpeaking} 
                />
              )}
              <ContactShadows opacity={0.4} scale={10} blur={2} far={4} color="#000000" />
            </Canvas>
          </div>
          
          <div className="absolute bottom-6 left-0 right-0 text-center z-20 pointer-events-none">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 drop-shadow-sm">
              {companion?.name || "Your Companion"}
            </h1>
            <div className="mt-2 inline-block px-3 py-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-xs font-medium tracking-wide">
              {companion?.personality_style || "Friendly AI"}
            </div>
          </div>
        </div>

        {/* RIGHT: Chat Area */}
        <div className="w-full lg:w-[60%] h-[50vh] lg:h-full flex flex-col bg-[#0a0a0f] relative z-10">
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth pb-24">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex w-full animate-slide-up ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[85%] md:max-w-[70%] p-4 text-[15px] leading-relaxed shadow-sm ${
                    msg.role === "user" 
                      ? "bg-indigo-600 text-white rounded-2xl rounded-tr-sm" 
                      : "glass text-gray-100 rounded-2xl rounded-tl-sm border border-white/5"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            
            {isSending && (
              <div className="flex w-full justify-start animate-fade-in">
                <div className="max-w-[85%] p-4 glass rounded-2xl rounded-tl-sm flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 md:p-6 bg-gradient-to-t from-[#0a0a0f] to-transparent absolute bottom-0 left-0 right-0 lg:pb-6 pb-20 pointer-events-none">
            <form 
              onSubmit={handleSendMessage} 
              className="flex items-center gap-2 bg-[#12121a]/90 backdrop-blur-xl border border-white/10 p-2 rounded-full shadow-2xl pointer-events-auto"
            >
              <button
                type="button"
                onClick={toggleRecording}
                className={`p-3 rounded-full transition-colors flex-shrink-0 ${
                  isRecording ? "bg-red-500/20 text-red-400" : "hover:bg-white/5 text-gray-400"
                }`}
                title={isRecording ? "Stop recording" : "Hold to talk"}
              >
                🎤
              </button>
              
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Message your companion..."
                className="flex-1 bg-transparent border-none outline-none text-gray-200 placeholder-gray-500 px-2 py-2"
                disabled={isSending}
              />
              
              <Button 
                type="submit" 
                disabled={!inputValue.trim() || isSending}
                className="rounded-full h-10 w-10 p-0 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 flex-shrink-0"
              >
                ↑
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-white/10 h-16 z-40 flex items-center justify-around px-4 pb-safe lg:px-12">
        <Link href="/" className="flex flex-col items-center gap-1 text-indigo-400 group">
          <span className="text-xl group-hover:scale-110 transition-transform">✨</span>
          <span className="text-[10px] font-medium tracking-wide uppercase">Companion</span>
        </Link>
        <Link href="/memories" className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors group">
          <span className="text-xl group-hover:scale-110 transition-transform">🧠</span>
          <span className="text-[10px] font-medium tracking-wide uppercase">Memories</span>
        </Link>
        <Link href="/customize" className="flex flex-col items-center gap-1 text-gray-500 hover:text-gray-300 transition-colors group">
          <span className="text-xl group-hover:scale-110 transition-transform">🎨</span>
          <span className="text-[10px] font-medium tracking-wide uppercase">Customize</span>
        </Link>
      </nav>

      {/* BREAK OVERLAY */}
      {showBreakOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 break-gradient backdrop-blur-xl bg-black/60 animate-fade-in">
          <div className="max-w-md w-full glass-strong border border-white/20 p-8 rounded-3xl text-center shadow-2xl relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white mb-3">Time for a breather</h2>
              <p className="text-gray-200 text-lg mb-2">
                &ldquo;We&apos;ve been talking for a while. I think you deserve a little time away from the screen.&rdquo;
              </p>
              <p className="text-gray-400 text-sm mb-8">
                I enjoy talking with you, but I don&apos;t want to become the only place you come for connection.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => setShowBreakOverlay(false)}
                  className="w-full py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium flex items-center gap-3 transition-all hover:scale-[1.02]"
                >
                  <span className="text-2xl">🌳</span> Go outside
                </button>
                <button 
                  onClick={() => setShowBreakOverlay(false)}
                  className="w-full py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium flex items-center gap-3 transition-all hover:scale-[1.02]"
                >
                  <span className="text-2xl">💬</span> Message a friend
                </button>
                <button 
                  onClick={() => setShowBreakOverlay(false)}
                  className="w-full py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium flex items-center gap-3 transition-all hover:scale-[1.02]"
                >
                  <span className="text-2xl">🎨</span> Do something creative
                </button>
                <button 
                  onClick={() => setShowBreakOverlay(false)}
                  className="w-full py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-medium flex items-center gap-3 transition-all hover:scale-[1.02]"
                >
                  <span className="text-2xl">🎵</span> Listen to music
                </button>
              </div>
              
              <button 
                onClick={() => setShowBreakOverlay(false)}
                className="mt-6 text-gray-500 hover:text-gray-300 text-sm underline-offset-4 hover:underline transition-all"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
