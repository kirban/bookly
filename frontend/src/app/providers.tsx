"use client";

import { useEffect, useRef } from "react";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { configureApiClient } from "@/lib/api-client";
import { Toaster } from "@/components/ui/sonner";

function ApiClientBridge({ children }: { children: React.ReactNode }) {
  const { accessToken, setAuth, logout } = useAuth();
  const tokenRef = useRef<string | null>(accessToken);

  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(() => {
    configureApiClient({
      getToken: () => tokenRef.current,
      setToken: (token) => {
        if (token) {
          tokenRef.current = token;
          const raw = localStorage.getItem("bookly_user");
          const user = raw ? JSON.parse(raw) : null;
          if (user) setAuth(token, user);
        } else {
          tokenRef.current = null;
        }
      },
      onUnauthorized: logout,
    });
  }, [setAuth, logout]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <ApiClientBridge>{children}</ApiClientBridge>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}
