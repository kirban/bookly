import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Тарифы — Bookly",
  description: "Выберите подходящий тариф для управления записями",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

interface Plan {
  id: string;
  name: string;
  slug: string;
  priceMonthly: string;
  maxAppointments: number | null;
  maxServices: number | null;
  features: {
    maxLocations: number | null;
    telegramNotifications: boolean;
    aiAssistant: boolean;
    analytics: boolean;
    customBranding: boolean;
  };
}

async function getPlans(): Promise<Plan[]> {
  try {
    const res = await fetch(`${API_URL}/plans`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

const FEATURE_LABELS: Record<string, string> = {
  telegramNotifications: "Telegram-уведомления",
  aiAssistant: "AI-ассистент",
  analytics: "Аналитика",
  customBranding: "Свой брендинг",
};

export default async function PricingPage() {
  const plans = await getPlans();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Тарифы
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Выберите подходящий план для вашей практики
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const price = parseFloat(plan.priceMonthly);
          const popular = plan.slug === "pro";
          const features = plan.features;

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                popular ? "border-primary ring-2 ring-primary" : ""
              }`}
            >
              {popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                  Популярный
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">
                    {price === 0
                      ? "Бесплатно"
                      : `${price.toLocaleString("ru-RU")} ₽`}
                  </span>
                  {price > 0 && (
                    <span className="text-muted-foreground"> / мес</span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ul className="flex-1 space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-green-500" />
                    {plan.maxAppointments
                      ? `До ${plan.maxAppointments} записей/мес`
                      : "Безлимитные записи"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-green-500" />
                    {plan.maxServices
                      ? `До ${plan.maxServices} услуг`
                      : "Безлимитные услуги"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-green-500" />
                    {features.maxLocations
                      ? `До ${features.maxLocations} ${features.maxLocations === 1 ? "адрес" : "адресов"}`
                      : "Безлимитные адреса"}
                  </li>
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                    const enabled =
                      features[key as keyof typeof features] as boolean;
                    return (
                      <li
                        key={key}
                        className={`flex items-center gap-2 ${
                          !enabled ? "text-muted-foreground line-through" : ""
                        }`}
                      >
                        <Check
                          className={`size-4 shrink-0 ${
                            enabled ? "text-green-500" : "text-muted-foreground"
                          }`}
                        />
                        {label}
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-6">
                  <Link href="/register">
                    <Button
                      className="w-full"
                      variant={popular ? "default" : "outline"}
                    >
                      {price === 0 ? "Начать бесплатно" : "Выбрать"}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
