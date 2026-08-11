"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      
      let body: URLSearchParams | string;
      const headers: Record<string, string> = {};
      
      if (isLogin) {
        body = new URLSearchParams();
        body.append('username', email);
        body.append('password', password);
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      } else {
        body = JSON.stringify({ email, password });
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers,
        body
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Authentication failed");
      }
      
      if (!isLogin) {
        setIsLogin(true);
        setSuccess("Account created! Please sign in.");
        setPassword('');
        return;
      }
      
      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      
      // Check if companion exists, redirect accordingly
      try {
        const compRes = await fetch(`${API_BASE}/companion/`, {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
        if (compRes.status === 404) {
          router.push('/customize');
          return;
        }
      } catch {
        // If companion check fails, go to customize
      }
      
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0f] text-white relative overflow-hidden p-4">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md p-8 md:p-10 glass rounded-3xl border border-white/10 shadow-2xl animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-semibold tracking-wider text-indigo-300 mb-3 uppercase">
            3D AI Companion Demo
          </div>
          <h1 className="text-4xl font-extrabold mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">
            DREAMMATE
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm leading-relaxed max-w-xs mx-auto">
            A supportive AI companion designed to encourage your real-world goals and healthy digital habits.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-zinc-400 font-medium ml-1 mb-1 block">Email address</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-indigo-500 focus:bg-white/[0.07] transition-all text-white placeholder:text-zinc-600 text-sm"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 font-medium ml-1 mb-1 block">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-indigo-500 focus:bg-white/[0.07] transition-all text-white placeholder:text-zinc-600 text-sm"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <p className="text-rose-400 text-xs text-center bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">{error}</p>}
          {success && <p className="text-emerald-400 text-xs text-center bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">{success}</p>}
          
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-6 text-base font-semibold mt-2 rounded-xl transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </Button>
        </form>
        
        <p className="mt-6 text-center text-zinc-400 text-xs">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
