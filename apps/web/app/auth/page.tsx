"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

      if (!res.ok) throw new Error("Authentication failed");
      
      if (!isLogin) {
        setIsLogin(true);
        setError("Registration successful! Please login.");
        return;
      }
      
      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950 text-white">
      <div className="w-full max-w-md p-8 bg-zinc-900 rounded-xl shadow-xl border border-zinc-800">
        <h1 className="text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          DREAMMATE
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-blue-500"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 focus:outline-none focus:border-blue-500"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-6 text-lg font-semibold mt-2">
            {isLogin ? 'Login' : 'Register'}
          </Button>
        </form>
        <p className="mt-6 text-center text-zinc-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-blue-400 hover:underline"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
