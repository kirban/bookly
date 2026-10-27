"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { Camera, Loader2, Check, X } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  slug: string;
  specialization: string;
  description: string | null;
  avatarUrl: string | null;
  phone: string;
  bufferMinutes: number;
  scheduleType: "fixed" | "flexible";
  emailVerified: boolean;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [scheduleType, setScheduleType] = useState<"fixed" | "flexible">(
    "fixed",
  );

  const [slug, setSlug] = useState("");
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [savingSlug, setSavingSlug] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const slugTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalSlugRef = useRef("");

  const populateForm = useCallback((p: Profile) => {
    setFirstName(p.firstName);
    setLastName(p.lastName);
    setSpecialization(p.specialization);
    setDescription(p.description ?? "");
    setPhone(p.phone);
    setBufferMinutes(p.bufferMinutes);
    setScheduleType(p.scheduleType);
    setSlug(p.slug);
    originalSlugRef.current = p.slug;
    setAvatarPreview(
      p.avatarUrl
        ? p.avatarUrl.startsWith("http")
          ? p.avatarUrl
          : `${API_URL.replace("/api", "")}${p.avatarUrl}`
        : null,
    );
  }, []);

  useEffect(() => {
    api
      .get<Profile>("/specialist/profile")
      .then((p) => {
        setProfile(p);
        populateForm(p);
      })
      .catch(() => toast.error("Не удалось загрузить профиль"))
      .finally(() => setLoading(false));
  }, [populateForm]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api.patch<Profile>("/specialist/profile", {
        firstName,
        lastName,
        specialization,
        description: description || null,
        phone,
        bufferMinutes,
        scheduleType,
      });
      setProfile(updated);
      toast.success("Профиль сохранён");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Ошибка сохранения";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Slug ---

  const checkSlug = useCallback(
    (value: string) => {
      if (!value || value === originalSlugRef.current) {
        setSlugStatus("idle");
        return;
      }
      if (!/^[a-z0-9-]+$/.test(value) || value.length < 3) {
        setSlugStatus("idle");
        return;
      }
      setSlugStatus("checking");
      api
        .get<{ available: boolean }>(
          `/specialist/profile/slug/check?slug=${encodeURIComponent(value)}`,
        )
        .then((res) => setSlugStatus(res.available ? "available" : "taken"))
        .catch(() => setSlugStatus("idle"));
    },
    [],
  );

  const onSlugChange = (value: string) => {
    const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(normalized);

    if (slugTimerRef.current) clearTimeout(slugTimerRef.current);
    slugTimerRef.current = setTimeout(() => checkSlug(normalized), 500);
  };

  const handleSaveSlug = async () => {
    setSavingSlug(true);
    try {
      const updated = await api.patch<Profile>("/specialist/profile/slug", {
        slug,
      });
      setProfile(updated);
      originalSlugRef.current = updated.slug;
      setSlugStatus("idle");
      toast.success("URL обновлён");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setSlugStatus("taken");
        toast.error("Этот URL уже занят");
      } else {
        toast.error("Ошибка обновления URL");
      }
    } finally {
      setSavingSlug(false);
    }
  };

  // --- Avatar ---

  const uploadAvatar = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png)$/)) {
      toast.error("Допустимы только JPEG и PNG");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Максимальный размер — 5 МБ");
      return;
    }

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const token = localStorage.getItem("bookly_token");
      const res = await fetch(`${API_URL}/specialist/profile/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { message?: string }).message ?? "Ошибка загрузки",
        );
      }

      const updated = (await res.json()) as Profile;
      setProfile(updated);
      setAvatarPreview(
        updated.avatarUrl
          ? updated.avatarUrl.startsWith("http")
            ? updated.avatarUrl
            : `${API_URL.replace("/api", "")}${updated.avatarUrl}`
          : null,
      );
      toast.success("Аватар обновлён");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatar(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadAvatar(file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Профиль</h1>
        <p className="text-muted-foreground">
          Основная информация о вашем аккаунте
        </p>
      </div>

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>Фото профиля</CardTitle>
          <CardDescription>
            Загрузите аватар (JPEG или PNG, до 5 МБ)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div
              role="button"
              tabIndex={0}
              className={`relative flex size-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  fileInputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {uploadingAvatar ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt="Аватар"
                  className="size-full object-cover"
                />
              ) : (
                <Camera className="size-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? "Загрузка..." : "Выбрать файл"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Или перетащите файл на аватар
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader>
          <CardTitle>Личные данные</CardTitle>
          <CardDescription>Обновите информацию о себе</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Иван"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Петров"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile?.email ?? ""} disabled />
            <p className="text-xs text-muted-foreground">
              Email нельзя изменить
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 123-45-67"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialization">Специализация</Label>
            <Input
              id="specialization"
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              placeholder="Психолог, массажист, и т.д."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">О себе</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Расскажите о себе и своих услугах..."
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bufferMinutes">Буфер между записями (мин)</Label>
              <Input
                id="bufferMinutes"
                type="number"
                min={0}
                max={120}
                value={bufferMinutes}
                onChange={(e) =>
                  setBufferMinutes(Math.max(0, parseInt(e.target.value) || 0))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduleType">Тип расписания</Label>
              <select
                id="scheduleType"
                value={scheduleType}
                onChange={(e) =>
                  setScheduleType(e.target.value as "fixed" | "flexible")
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="fixed">Фиксированное</option>
                <option value="flexible">Гибкое</option>
              </select>
            </div>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Сохранить
          </Button>
        </CardContent>
      </Card>

      {/* Slug */}
      <Card>
        <CardHeader>
          <CardTitle>URL страницы записи</CardTitle>
          <CardDescription>
            Персональная ссылка для ваших клиентов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Адрес</Label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm text-muted-foreground">
                bookly.app/
              </span>
              <div className="relative flex-1">
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => onSlugChange(e.target.value)}
                  placeholder="your-name"
                  className="pr-8"
                />
                <div className="absolute inset-y-0 right-2 flex items-center">
                  {slugStatus === "checking" && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                  {slugStatus === "available" && (
                    <Check className="size-4 text-green-500" />
                  )}
                  {slugStatus === "taken" && (
                    <X className="size-4 text-red-500" />
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {slugStatus === "available" && "Этот URL свободен"}
              {slugStatus === "taken" && "Этот URL уже занят"}
              {slugStatus === "idle" &&
                slug === originalSlugRef.current &&
                "Текущий адрес вашей страницы"}
              {slugStatus === "idle" &&
                slug !== originalSlugRef.current &&
                "Только строчные буквы, цифры и дефисы"}
            </p>
          </div>
          <Button
            onClick={handleSaveSlug}
            disabled={
              savingSlug ||
              slugStatus === "taken" ||
              slugStatus === "checking" ||
              slug === originalSlugRef.current ||
              slug.length < 3
            }
            variant="outline"
          >
            {savingSlug && <Loader2 className="mr-2 size-4 animate-spin" />}
            Обновить URL
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
