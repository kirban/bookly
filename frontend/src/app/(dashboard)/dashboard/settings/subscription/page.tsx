"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, CreditCard, Calendar, X } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  priceMonthly: string;
  maxAppointments: number | null;
  maxServices: number | null;
  features: Record<string, unknown>;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: string | null;
  paymentProviderId: string | null;
}

interface SubscriptionState {
  plan: Plan | null;
  subscription: Subscription | null;
}

interface Usage {
  plan: string;
  appointments: { used: number; limit: number };
  services: { used: number; limit: number };
  locations: { used: number; limit: number };
}

export default function SubscriptionSettingsPage() {
  const [subState, setSubState] = useState<SubscriptionState | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sub, useData] = await Promise.all([
        api.get<SubscriptionState>("/specialist/subscription"),
        api.get<Usage>("/specialist/plan-usage"),
      ]);
      setSubState(sub);
      setUsage(useData);
    } catch {
      toast.error("Не удалось загрузить данные подписки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancel = async () => {
    if (!confirm("Отменить подписку? Доступ сохранится до конца оплаченного периода.")) return;
    setCancelling(true);
    try {
      await api.post("/billing/cancel");
      toast.success("Подписка отменена");
      await fetchData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ошибка отмены");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const plan = subState?.plan ?? null;
  const subscription = subState?.subscription ?? null;
  const isPaid = subscription && subscription.status !== "cancelled";
  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Подписка</h1>
        <p className="text-muted-foreground">
          Текущий тариф и использование лимитов
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-5" />
            Текущий тариф
          </CardTitle>
          <CardDescription>
            {plan?.name ?? "Free"} — лимиты и возможности по вашему плану
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-2xl font-semibold">
                {plan?.name ?? "Free"}
              </p>
              <p className="text-sm text-muted-foreground">
                {plan?.priceMonthly && Number(plan.priceMonthly) > 0
                  ? `${Number(plan.priceMonthly).toLocaleString("ru-RU")} ₽/мес`
                  : "Бесплатно"}
              </p>
            </div>
            {isPaid && periodEnd && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                Оплачено до {periodEnd}
              </div>
            )}
          </div>
          {isPaid && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling && <Loader2 className="mr-2 size-4 animate-spin" />}
              <X className="mr-2 size-4" />
              Отменить подписку
            </Button>
          )}
        </CardContent>
      </Card>

      {usage && (
        <Card>
          <CardHeader>
            <CardTitle>Использование</CardTitle>
            <CardDescription>
              Лимиты по тарифу за текущий период
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span className="text-muted-foreground">Записи в этом месяце</span>
                <span>
                  {usage?.appointments?.used ?? 0} / {usage?.appointments?.limit ?? 0}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Услуг</span>
                <span>
                  {usage?.services?.used ?? 0} / {usage?.services?.limit ?? 0}
                </span>
              </li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Локаций</span>
                <span>
                  {usage?.locations?.used ?? 0} / {usage?.locations?.limit ?? 0}
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}

      {plan?.slug === "free" && (
        <Card className="border-primary/30">
          <CardContent className="pt-6">
            <p className="mb-4 text-sm text-muted-foreground">
              Расширьте возможности: больше услуг, локаций и записей — перейдите на платный тариф.
            </p>
            <Button asChild>
              <Link href="/pricing">Смотреть тарифы</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
