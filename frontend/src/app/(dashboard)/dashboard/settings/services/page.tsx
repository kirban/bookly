"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Briefcase,
  Plus,
  Pencil,
  Power,
  PowerOff,
  Clock,
  Loader2,
} from "lucide-react";

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: string | null;
  description: string | null;
  locationId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface Location {
  id: string;
  name: string;
  city: string;
  address: string;
}

interface ServiceForm {
  name: string;
  durationMinutes: number;
  price: string;
  description: string;
  locationId: string;
  isActive: boolean;
}

const emptyForm: ServiceForm = {
  name: "",
  durationMinutes: 30,
  price: "",
  description: "",
  locationId: "",
  isActive: true,
};

export default function ServicesSettingsPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [svc, locs] = await Promise.all([
        api.get<Service[]>("/specialist/services"),
        api.get<Location[]>("/specialist/locations"),
      ]);
      setServices(svc);
      setLocations(locs);
    } catch {
      toast.error("Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (svc: Service) => {
    setEditingId(svc.id);
    setForm({
      name: svc.name,
      durationMinutes: svc.durationMinutes,
      price: svc.price ?? "",
      description: svc.description ?? "",
      locationId: svc.locationId ?? "",
      isActive: svc.isActive,
    });
    setDialogOpen(true);
  };

  const openDeactivate = (id: string) => {
    setDeactivatingId(id);
    setDeactivateDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Введите название услуги");
      return;
    }
    if (form.durationMinutes < 15) {
      toast.error("Минимальная длительность — 15 минут");
      return;
    }
    if (form.durationMinutes % 5 !== 0) {
      toast.error("Длительность должна быть кратна 5 минутам");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        durationMinutes: form.durationMinutes,
        price: form.price ? parseFloat(form.price) : undefined,
        description: form.description.trim() || undefined,
        locationId: form.locationId || undefined,
        isActive: form.isActive,
      };

      if (editingId) {
        await api.patch<Service>(`/specialist/services/${editingId}`, payload);
        toast.success("Услуга обновлена");
      } else {
        await api.post<Service>("/specialist/services", payload);
        toast.success("Услуга добавлена");
      }

      setDialogOpen(false);
      await fetchData();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Ошибка сохранения";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivatingId) return;

    setToggling(true);
    try {
      await api.delete(`/specialist/services/${deactivatingId}`);
      toast.success("Услуга деактивирована");
      setDeactivateDialogOpen(false);
      setDeactivatingId(null);
      await fetchData();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Ошибка";
      toast.error(message);
    } finally {
      setToggling(false);
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await api.patch(`/specialist/services/${id}`, { isActive: true });
      toast.success("Услуга активирована");
      await fetchData();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Ошибка";
      toast.error(message);
    }
  };

  const locationName = (id: string | null) => {
    if (!id) return "Все локации";
    const loc = locations.find((l) => l.id === id);
    return loc ? loc.name : "—";
  };

  const formatPrice = (price: string | null) => {
    if (!price) return "Бесплатно";
    const num = parseFloat(price);
    return `${num.toLocaleString("ru-RU")} ₽`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeServices = services.filter((s) => s.isActive);
  const inactiveServices = services.filter((s) => !s.isActive);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Услуги</h1>
          <p className="text-muted-foreground">
            Управление списком ваших услуг
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Добавить
        </Button>
      </div>

      {services.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="mb-4 size-12 text-muted-foreground/50" />
            <h3 className="mb-1 text-lg font-medium">Услуги не добавлены</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Добавьте первую услугу для записи клиентов
            </p>
            <Button onClick={openCreate} variant="outline">
              <Plus className="mr-2 size-4" />
              Добавить услугу
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeServices.length > 0 && (
            <div className="space-y-3">
              {activeServices.map((svc) => (
                <Card key={svc.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{svc.name}</h3>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Активна
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {svc.durationMinutes} мин
                        </span>
                        <span>{formatPrice(svc.price)}</span>
                        <span>{locationName(svc.locationId)}</span>
                      </div>
                      {svc.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {svc.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEdit(svc)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => openDeactivate(svc.id)}
                      >
                        <PowerOff className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {inactiveServices.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">
                Неактивные
              </h2>
              {inactiveServices.map((svc) => (
                <Card key={svc.id} className="opacity-60">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{svc.name}</h3>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Неактивна
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {svc.durationMinutes} мин
                        </span>
                        <span>{formatPrice(svc.price)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEdit(svc)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-green-600 hover:text-green-600"
                        onClick={() => handleReactivate(svc.id)}
                      >
                        <Power className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Редактировать услугу" : "Новая услуга"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Измените параметры услуги"
                : "Добавьте услугу, которую вы предоставляете"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="svc-name">
                Название <span className="text-destructive">*</span>
              </Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Стрижка"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="svc-duration">
                  Длительность (мин) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="svc-duration"
                  type="number"
                  min={15}
                  step={5}
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      durationMinutes: parseInt(e.target.value) || 15,
                    })
                  }
                  placeholder="30"
                />
                <p className="text-xs text-muted-foreground">
                  От 15 минут, шаг 5 минут
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="svc-price">Цена (₽)</Label>
                <Input
                  id="svc-price"
                  type="number"
                  min={0}
                  step={100}
                  value={form.price}
                  onChange={(e) =>
                    setForm({ ...form, price: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="svc-description">Описание</Label>
              <Textarea
                id="svc-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Описание услуги..."
                rows={3}
              />
            </div>

            {locations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="svc-location">Привязка к локации</Label>
                <select
                  id="svc-location"
                  value={form.locationId}
                  onChange={(e) =>
                    setForm({ ...form, locationId: e.target.value })
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Все локации</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} — {loc.city}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Без привязки — услуга доступна на всех адресах
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {editingId ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Деактивировать услугу?</DialogTitle>
            <DialogDescription>
              Услуга станет недоступна для записи. Вы сможете активировать её
              позже.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeactivateDialogOpen(false)}
              disabled={toggling}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={toggling}
            >
              {toggling && <Loader2 className="mr-2 size-4 animate-spin" />}
              Деактивировать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
