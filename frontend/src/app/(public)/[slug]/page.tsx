import { notFound } from "next/navigation";
import { Metadata } from "next";
import { MapPin, Clock, Banknote, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

interface SpecialistLocation {
  id: string;
  name: string;
  city: string;
  address: string;
  isDefault: boolean;
}

interface SpecialistService {
  id: string;
  name: string;
  durationMinutes: number;
  price: string | null;
  description: string | null;
  locationId: string | null;
}

interface PublicSpecialist {
  id: string;
  firstName: string;
  lastName: string;
  slug: string;
  specialization: string | null;
  description: string | null;
  avatarUrl: string | null;
  locations: SpecialistLocation[];
  services: SpecialistService[];
}

async function getSpecialist(slug: string): Promise<PublicSpecialist | null> {
  try {
    const res = await fetch(`${API_URL}/public/specialists/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const specialist = await getSpecialist(slug);

  if (!specialist) {
    return { title: "Специалист не найден — Bookly" };
  }

  const name = [specialist.firstName, specialist.lastName]
    .filter(Boolean)
    .join(" ");

  const desc =
    specialist.description ??
    `Онлайн-запись к ${name}. ${specialist.specialization ?? ""}`;

  return {
    title: `${name} — Записаться онлайн | Bookly`,
    description: desc,
    openGraph: {
      title: `${name} — Записаться онлайн`,
      description: desc,
      type: "profile",
      ...(specialist.avatarUrl ? { images: [{ url: specialist.avatarUrl }] } : {}),
    },
    twitter: {
      card: "summary",
      title: `${name} — Записаться онлайн`,
      description: desc,
    },
  };
}

export default async function PublicSpecialistPage({ params }: PageProps) {
  const { slug } = await params;
  const specialist = await getSpecialist(slug);

  if (!specialist) {
    notFound();
  }

  const name = [specialist.firstName, specialist.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      {/* Profile header */}
      <div className="mb-8 flex flex-col items-center text-center">
        {specialist.avatarUrl ? (
          <img
            src={specialist.avatarUrl}
            alt={name}
            className="mb-4 size-24 rounded-full object-cover ring-2 ring-primary/20"
          />
        ) : (
          <div className="mb-4 flex size-24 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
            <User className="size-10 text-primary" />
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {name}
        </h1>
        {specialist.specialization && (
          <p className="mt-1 text-muted-foreground">
            {specialist.specialization}
          </p>
        )}
        {specialist.description && (
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            {specialist.description}
          </p>
        )}
      </div>

      {/* Locations */}
      {specialist.locations.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Адреса приёма
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {specialist.locations.map((loc) => (
              <Card key={loc.id} className="border-border/60">
                <CardContent className="flex items-start gap-3 p-4">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium">{loc.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {loc.city}, {loc.address}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Services */}
      {specialist.services.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Услуги
          </h2>
          <div className="space-y-3">
            {specialist.services.map((svc) => (
              <Card key={svc.id} className="border-border/60">
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{svc.name}</p>
                    {svc.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                        {svc.description}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {svc.durationMinutes} мин
                      </span>
                      {svc.price && (
                        <span className="flex items-center gap-1">
                          <Banknote className="size-3.5" />
                          {parseFloat(svc.price).toLocaleString("ru-RU")} ₽
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/${slug}/book?service=${svc.id}`}>
                    <Button size="sm">Записаться</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {specialist.services.length === 0 && specialist.locations.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Этот специалист ещё не настроил расписание и услуги.
          </p>
        </div>
      )}
    </div>
  );
}
