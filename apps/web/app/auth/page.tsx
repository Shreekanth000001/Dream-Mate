"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

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

      const res = await fetch(`http://localhost:8000${endpoint}`, {
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
        const compRes = await fetch('http://localhost:8000/companion/', {
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
    <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-md p-10 glass rounded-2xl shadow-2xl animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            DREAMMATE
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
            An AI companion that cares about you without trying to keep you addicted to it.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all text-white placeholder:text-zinc-500"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.07] transition-all text-white placeholder:text-zinc-500"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {success && <p className="text-emerald-400 text-sm text-center">{success}</p>}
          
          <Button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-6 text-lg font-semibold mt-2 rounded-xl transition-all disabled:opacity-50"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
          </Button>
        </form>
        
        <p className="mt-8 text-center text-zinc-500 text-sm">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
