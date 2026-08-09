const API_BASE = "http://localhost:8000";

export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    if (headers instanceof Headers) {
      headers.set('Authorization', `Bearer ${token}`);
    } else if (Array.isArray(headers)) {
      headers.push(['Authorization', `Bearer ${token}`]);
    } else {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
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

export const api = {
  getMe: () => fetchAPI('/auth/me'),
  getCompanion: () => fetchAPI('/companion/'),
  getDreams: () => fetchAPI('/dreams/'),
  getTasks: () => fetchAPI('/tasks/'),
  getMemories: () => fetchAPI('/memories/'),
  deleteMemory: (id: string) => fetchAPI(`/memories/${id}`, { method: 'DELETE' }),
  chat: (message: string) => fetchAPI('/chat/', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),
};
