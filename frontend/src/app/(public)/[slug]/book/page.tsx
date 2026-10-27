"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  Check,
  Clock,
  Banknote,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  User,
  MapPin,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

interface Location {
  id: string;
  name: string;
  city: string;
  address: string;
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: string | null;
  description: string | null;
  locationId: string | null;
}

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string | null;
  avatarUrl: string | null;
  locations: Location[];
  services: Service[];
}

type Step = "service" | "datetime" | "details" | "confirmation";

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function BookingPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const preselectedService = searchParams.get("service");

  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("service");

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<Array<string | { time: string; endTime?: string }>>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/public/specialists/${params.slug}`);
        if (!res.ok) return;
        const data: Specialist = await res.json();
        setSpecialist(data);

        if (data.locations.length === 1) {
          setSelectedLocation(data.locations[0]);
        }

        if (preselectedService) {
          const svc = data.services.find((s) => s.id === preselectedService);
          if (svc) {
            setSelectedService(svc);
            if (svc.locationId) {
              const loc = data.locations.find((l) => l.id === svc.locationId);
              if (loc) setSelectedLocation(loc);
            }
            // Переходить на "Дата и время" только если локация уже известна (одна или привязана к услуге)
            const hasLocation = data.locations.length === 1 || (svc.locationId && data.locations.some((l) => l.id === svc.locationId));
            if (hasLocation) setStep("datetime");
          }
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, [params.slug, preselectedService]);

  const fetchSlots = useCallback(
    async (date: string) => {
      if (!specialist || !selectedService || !selectedLocation) return;
      setSlotsLoading(true);
      try {
        const res = await fetch(
          `${API_URL}/schedule/available-slots?specialistId=${specialist.id}&locationId=${selectedLocation.id}&serviceId=${selectedService.id}&date=${date}`,
        );
        if (res.ok) {
          const data = await res.json();
          setAvailableSlots(Array.isArray(data) ? data : []);
        }
      } catch {
        setAvailableSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    },
    [specialist, selectedService, selectedLocation],
  );

  // На шаге "Дата и время": выставить дату по умолчанию (сегодня) и сразу запросить слоты
  useEffect(() => {
    if (step !== "datetime") return;
    const today = toLocalDateString(new Date());
    const dateToFetch = selectedDate || today;
    if (!selectedDate) {
      setSelectedDate(today);
    }
    if (specialist && selectedService && selectedLocation) {
      fetchSlots(dateToFetch);
    }
  }, [step, selectedDate, specialist, selectedService, selectedLocation, fetchSlots]);

  const handleBook = async () => {
    if (!specialist || !selectedService || !selectedLocation) return;
    const today = toLocalDateString(new Date());
    if (selectedDate < today) {
      toast.error("Нельзя записаться на прошедшую дату");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/public/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialistId: specialist.id,
          serviceId: selectedService.id,
          locationId: selectedLocation.id,
          date: selectedDate,
          startTime: selectedTime,
          clientName,
          clientPhone,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Ошибка создания записи");
      }
      setBooked(true);
      setStep("confirmation");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!specialist) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Специалист не найден
      </div>
    );
  }

  const name = [specialist.firstName, specialist.lastName]
    .filter(Boolean)
    .join(" ");

  const filteredServices =
    selectedLocation && specialist.services.length > 0
      ? specialist.services.filter(
          (s) => !s.locationId || s.locationId === selectedLocation.id,
        )
      : specialist.services;

  const steps: { key: Step; label: string }[] = [
    { key: "service", label: "Услуга" },
    { key: "datetime", label: "Дата и время" },
    { key: "details", label: "Ваши данные" },
    { key: "confirmation", label: "Готово" },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  // Generate next 14 days for date selection (local date)
  const dates: { value: string; label: string }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push({
      value: toLocalDateString(d),
      label: d.toLocaleDateString("ru-RU", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        {specialist.avatarUrl ? (
          <img
            src={specialist.avatarUrl}
            alt={name}
            className="size-10 rounded-full object-cover"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <User className="size-5 text-primary" />
          </div>
        )}
        <div>
          <h1 className="font-semibold">{name}</h1>
          {specialist.specialization && (
            <p className="text-sm text-muted-foreground">
              {specialist.specialization}
            </p>
          )}
        </div>
      </div>

      {/* Steps indicator */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex size-7 items-center justify-center rounded-full text-xs font-medium ${
                i < stepIndex
                  ? "bg-primary text-primary-foreground"
                  : i === stepIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < stepIndex ? <Check className="size-3.5" /> : i + 1}
            </div>
            <span
              className={`hidden text-sm sm:inline ${
                i === stepIndex ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className="mx-1 h-px w-6 bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select location (if multiple) + service */}
      {step === "service" && (
        <div className="space-y-6">
          {specialist.locations.length > 1 && (
            <div>
              <h2 className="mb-3 font-medium">Выберите адрес</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {specialist.locations.map((loc) => (
                  <Card
                    key={loc.id}
                    className={`cursor-pointer transition-colors hover:border-primary/50 ${
                      selectedLocation?.id === loc.id
                        ? "border-primary ring-1 ring-primary"
                        : ""
                    }`}
                    onClick={() => setSelectedLocation(loc)}
                  >
                    <CardContent className="flex items-start gap-2 p-3">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{loc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {loc.city}, {loc.address}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 font-medium">Выберите услугу</h2>
            <div className="space-y-2">
              {filteredServices.map((svc) => (
                <Card
                  key={svc.id}
                  className={`cursor-pointer transition-colors hover:border-primary/50 ${
                    selectedService?.id === svc.id
                      ? "border-primary ring-1 ring-primary"
                      : ""
                  }`}
                  onClick={() => setSelectedService(svc)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{svc.name}</p>
                      <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
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
                    {selectedService?.id === svc.id && (
                      <Check className="size-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Button
            className="w-full"
            disabled={!selectedService || !selectedLocation}
            onClick={() => setStep("datetime")}
          >
            Далее
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      )}

      {/* Step 2: Date + time */}
      {step === "datetime" && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-medium">
              <CalendarDays className="size-4" />
              Выберите дату
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {dates.map((d) => (
                <button
                  key={d.value}
                  onClick={() => {
                    setSelectedDate(d.value);
                    setSelectedTime("");
                  }}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                    selectedDate === d.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:border-primary/50"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 font-medium">
              <Clock className="size-4" />
              Выберите время
            </h2>
            {slotsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Нет свободных слотов на эту дату
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {availableSlots.map((slot) => {
                  const time = typeof slot === "string" ? slot : slot.time;
                  return (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`rounded-lg border px-2 py-2 text-sm transition-colors ${
                        selectedTime === time
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:border-primary/50"
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("service")}>
              <ArrowLeft className="mr-2 size-4" />
              Назад
            </Button>
            <Button
              className="flex-1"
              disabled={!selectedTime}
              onClick={() => setStep("details")}
            >
              Далее
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Client details */}
      {step === "details" && (
        <div className="space-y-6">
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <p className="font-medium">{selectedService?.name}</p>
            <p className="text-muted-foreground">
              {new Date(selectedDate).toLocaleDateString("ru-RU", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              в {selectedTime}
            </p>
            <p className="text-muted-foreground">{selectedLocation?.name}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Ваше имя <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Иван Петров"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">
                Телефон <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="+7 999 123 45 67"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("datetime")}>
              <ArrowLeft className="mr-2 size-4" />
              Назад
            </Button>
            <Button
              className="flex-1"
              disabled={!clientName || !clientPhone || saving}
              onClick={handleBook}
            >
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Записаться
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === "confirmation" && booked && (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100">
            <Check className="size-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Вы записаны!</h2>
            <p className="mt-2 text-muted-foreground">
              {selectedService?.name} — {" "}
              {new Date(selectedDate).toLocaleDateString("ru-RU", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              в {selectedTime}
            </p>
            <p className="text-muted-foreground">
              {selectedLocation?.name}, {selectedLocation?.city}
            </p>
            <p className="mt-1 font-medium">Специалист: {name}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Подключите Telegram-бот, чтобы получать напоминания о записях.
          </p>
        </div>
      )}
    </div>
  );
}
