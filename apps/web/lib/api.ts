const API_BASE = "http://localhost:8000";

export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    throw new Error(await res.text() || 'An error occurred');
  }

  return res.json();
};

export interface CompanionData {
  id?: string;
  user_id?: string;
  name: string;
  appearance: Record<string, unknown>;
  personality_style: string;
  accountability_style: string;
}

export interface MemoryItem {
  id: string;
  content: string;
  type: string;
  importance: number;
}

export interface ConsolidationResult {
  analyzed: number;
  retained: number;
  forgotten: number;
  details: { content: string; action: string; reason: string }[];
}

export interface ChatResponse {
  reply: string;
  avatar_emotion: { emotion: string; intensity: number };
  shouldSpeak: boolean;
  take_break_suggested: boolean;
}

export const api = {
  // Auth
  getMe: () => fetchAPI('/auth/me'),
  
  // Companion
  getCompanion: (): Promise<CompanionData> => fetchAPI('/companion/'),
  createCompanion: (data: Partial<CompanionData>): Promise<CompanionData> => fetchAPI('/companion/', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCompanion: (data: Partial<CompanionData>): Promise<CompanionData> => fetchAPI('/companion/', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  
  // Chat
  chat: (message: string): Promise<ChatResponse> => fetchAPI('/chat/', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),
  
  // Memories
  getMemories: (): Promise<MemoryItem[]> => fetchAPI('/memories/'),
  deleteMemory: (id: string) => fetchAPI(`/memories/${id}`, { method: 'DELETE' }),
  consolidateMemories: (): Promise<ConsolidationResult> => fetchAPI('/memories/consolidate', { method: 'POST' }),
  
  // Dreams (kept for API compatibility)
  getDreams: () => fetchAPI('/dreams/'),
  getTasks: () => fetchAPI('/tasks/'),
};
