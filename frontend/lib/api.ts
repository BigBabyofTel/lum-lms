import { useUserStore } from '@/store/useUserStore';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  return attemptFetch<T>(path, options);
}

async function attemptFetch<T>(
  path: string,
  options: RequestInit,
  isRetry = false
): Promise<T> {
  const token = useUserStore.getState().access_token;
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: 'include', // required for the refresh_token cookie to be sent
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !isRetry) {
    // Try refreshing the token once
    const refreshRes = await fetch(`${BASE}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshRes.ok) {
      const { access_token } = await refreshRes.json();
      useUserStore.getState().setAccessToken(access_token);
      return attemptFetch<T>(path, options, true); // retry original request
    }
    // Refresh failed — session is truly expired
    useUserStore.getState().clearUser();
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}
