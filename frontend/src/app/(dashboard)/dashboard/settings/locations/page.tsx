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
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  Loader2,
} from "lucide-react";

interface Location {
  id: string;
  name: string;
  city: string;
  address: string;
  description: string | null;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface LocationForm {
  name: string;
  city: string;
  address: string;
  description: string;
  isDefault: boolean;
}

const emptyForm: LocationForm = {
  name: "",
  city: "",
  address: "",
  description: "",
  isDefault: false,
};

export default function LocationsSettingsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<LocationForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchLocations = useCallback(async () => {
    try {
      const data = await api.get<Location[]>("/specialist/locations");
      setLocations(data);
    } catch {
      toast.error("Не удалось загрузить локации");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (loc: Location) => {
    setEditingId(loc.id);
    setForm({
      name: loc.name,
      city: loc.city,
      address: loc.address,
      description: loc.description ?? "",
      isDefault: loc.isDefault,
    });
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.city.trim() || !form.address.trim()) {
      toast.error("Заполните обязательные поля: название, город, адрес");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        description: form.description.trim() || undefined,
        isDefault: form.isDefault,
      };

      if (editingId) {
        await api.patch<Location>(`/specialist/locations/${editingId}`, payload);
        toast.success("Локация обновлена");
      } else {
        await api.post<Location>("/specialist/locations", payload);
        toast.success("Локация добавлена");
      }

      setDialogOpen(false);
      await fetchLocations();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Ошибка сохранения";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setDeleting(true);
    try {
      await api.delete(`/specialist/locations/${deletingId}`);
      toast.success("Локация удалена");
      setDeleteDialogOpen(false);
      setDeletingId(null);
      await fetchLocations();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Ошибка удаления";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Локации</h1>
          <p className="text-muted-foreground">
            Управление местами приёма
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 size-4" />
          Добавить
        </Button>
      </div>

      {locations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="mb-4 size-12 text-muted-foreground/50" />
            <h3 className="mb-1 text-lg font-medium">Локации не добавлены</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Добавьте первый адрес для приёма клиентов
            </p>
            <Button onClick={openCreate} variant="outline">
              <Plus className="mr-2 size-4" />
              Добавить локацию
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {locations.map((loc) => (
            <Card key={loc.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{loc.name}</CardTitle>
                    {loc.isDefault && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        <Star className="size-3" />
                        По умолчанию
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEdit(loc)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => openDelete(loc.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <CardDescription>{loc.city}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{loc.address}</p>
                {loc.description && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {loc.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Редактировать локацию" : "Новая локация"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Измените данные адреса"
                : "Добавьте адрес, где вы принимаете клиентов"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loc-name">
                Название <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Основной кабинет"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc-city">
                Город <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loc-city"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Москва"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc-address">
                Адрес <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loc-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="ул. Пушкина, д. 10, каб. 5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="loc-description">Описание</Label>
              <Textarea
                id="loc-description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Как найти: вход со двора, 2 этаж..."
                rows={3}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm({ ...form, isDefault: e.target.checked })
                }
                className="size-4 rounded border-input accent-primary"
              />
              <span className="text-sm">Адрес по умолчанию</span>
            </label>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить локацию?</DialogTitle>
            <DialogDescription>
              Это действие нельзя отменить. Локация будет удалена.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
