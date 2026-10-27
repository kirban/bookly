"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface User {
  id: string;
  email: string;
  name: string;
  slug?: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<string | null>;
  setAuth: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function getStoredAuth(): { accessToken: string | null; user: User | null } {
  if (typeof window === "undefined") return { accessToken: null, user: null };
  try {
    const token = localStorage.getItem("bookly_token");
    const raw = localStorage.getItem("bookly_user");
    const user = raw ? (JSON.parse(raw) as User) : null;
    return { accessToken: token, user };
  } catch {
    return { accessToken: null, user: null };
  }
}

function persistAuth(token: string | null, user: User | null) {
  if (typeof window === "undefined") return;
  if (token && user) {
    localStorage.setItem("bookly_token", token);
    localStorage.setItem("bookly_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("bookly_token");
    localStorage.removeItem("bookly_user");
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    accessToken: null,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    const stored = getStoredAuth();
    queueMicrotask(() => {
      setState({
        accessToken: stored.accessToken,
        user: stored.user,
        isLoading: false,
      });
    });
  }, []);

  const setAuth = useCallback((token: string, user: User) => {
    persistAuth(token, user);
    setState({ accessToken: token, user, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    persistAuth(null, null);
    setState({ accessToken: null, user: null, isLoading: false });
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        logout();
        return null;
      }
      const data = (await res.json()) as { accessToken: string; user: User };
      setAuth(data.accessToken, data.user);
      return data.accessToken;
    } catch {
      logout();
      return null;
    }
  }, [logout, setAuth]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? "Ошибка входа");
      }
      const data = (await res.json()) as Record<string, unknown>;
      const token = (data.access_token ?? data.accessToken) as string;
      const userData = data.user as User | undefined;
      const user: User = userData ?? { id: '', email, name: email };
      setAuth(token, user);
    },
    [setAuth],
  );

  const register = useCallback(
    async (firstName: string, lastName: string, email: string, password: string) => {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? "Ошибка регистрации");
      }
      const data = (await res.json()) as Record<string, unknown>;
      const token = (data.access_token ?? data.accessToken) as string;
      const userData = data.user as User | undefined;
      const user: User = userData ?? { id: '', email, name: `${firstName} ${lastName}`.trim() };
      setAuth(token, user);
    },
    [setAuth],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      refreshToken,
      setAuth,
    }),
    [state, login, register, logout, refreshToken, setAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
