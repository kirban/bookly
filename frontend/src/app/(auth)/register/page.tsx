"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function OAuthButtons() {
  return (
    <div className="space-y-2">
      <a href={`${API_URL}/auth/oauth/google`} className="block">
        <Button variant="outline" className="w-full" type="button">
          <svg className="mr-2 size-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </Button>
      </a>
      <a href={`${API_URL}/auth/oauth/yandex`} className="block">
        <Button variant="outline" className="w-full" type="button">
          <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.32 21.6h2.4V2.4h-3.36c-4.2 0-6.48 2.28-6.48 5.64 0 2.76 1.32 4.32 3.72 6l-4.2 7.56h2.64l4.56-8.28-1.68-1.2c-1.92-1.32-2.88-2.64-2.88-4.92 0-2.28 1.44-3.72 3.84-3.72h1.44V21.6z" />
          </svg>
          Яндекс
        </Button>
      </a>
      <a href={`${API_URL}/auth/oauth/vk`} className="block">
        <Button variant="outline" className="w-full" type="button">
          <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="#0077FF">
            <path d="M12.77 19.15h1.18s.36-.04.54-.23c.17-.18.16-.51.16-.51s-.02-1.56.7-1.79c.71-.22 1.63 1.49 2.6 2.15.73.5 1.29.39 1.29.39l2.59-.04s1.35-.08.71-1.14c-.05-.09-.38-.78-1.94-2.2-1.63-1.49-1.41-1.25.55-3.83 1.2-1.57 1.67-2.53 1.52-2.94-.14-.39-1.02-.29-1.02-.29l-2.91.02s-.22-.03-.38.07c-.15.1-.25.32-.25.32s-.45 1.2-1.04 2.22c-1.26 2.16-1.76 2.28-1.97 2.14-.48-.32-.36-1.29-.36-1.98 0-2.15.33-3.05-.63-3.28-.32-.08-.55-.13-1.36-.14-.04 0-1.03.01-1.03.01s-.56.02-.84.27c-.25.22-.19.69-.19.69s.28 1.31-.33 1.47c-.42.11-.99-.46-1.58-1.34-.38-.57-.67-1.22-.67-1.22s-.09-.18-.23-.28c-.18-.12-.42-.16-.42-.16l-2.77.02s-.41.01-.56.19c-.14.16-.01.5-.01.5s2.08 4.87 4.44 7.32c2.16 2.24 4.62 2.1 4.62 2.1z" />
          </svg>
          VK ID
        </Button>
      </a>
    </div>
  );
}

export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }
    setLoading(true);
    try {
      await register(firstName, lastName, email, password);
      router.push("/dashboard");
    } catch {
      toast.error("Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          Регистрация в Bookly
        </CardTitle>
        <CardDescription>
          Создайте аккаунт специалиста для управления записями
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <OAuthButtons />

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">или</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя</Label>
              <Input
                id="firstName"
                placeholder="Имя"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                placeholder="Фамилия"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="Минимум 8 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Подтвердите пароль</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Повторите пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Создать аккаунт
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
