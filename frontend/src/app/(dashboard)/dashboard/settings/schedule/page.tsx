"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Clock,
  Loader2,
  Save,
  ChevronLeft,
  ChevronRight,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";

interface Location {
  id: string;
  name: string;
  city: string;
  isDefault: boolean;
}

interface ScheduleTemplate {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorking: boolean;
  locationId: string;
}

interface ScheduleSlot {
  id: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBlocked: boolean;
  blockReason: string | null;
}

interface DayRow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorking: boolean;
}

type ScheduleMode = "fixed" | "flexible";

const DAY_NAMES = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
];

const DAY_NAMES_SHORT = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

const DEFAULT_SCHEDULE: DayRow[] = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", isWorking: true },
  { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isWorking: true },
  { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", isWorking: true },
  { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", isWorking: true },
  { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", isWorking: true },
  { dayOfWeek: 6, startTime: "09:00", endTime: "14:00", isWorking: false },
  { dayOfWeek: 0, startTime: "09:00", endTime: "14:00", isWorking: false },
];

function templatesToRows(templates: ScheduleTemplate[]): DayRow[] {
  const map = new Map<number, ScheduleTemplate>();
  for (const t of templates) map.set(t.dayOfWeek, t);

  return DEFAULT_SCHEDULE.map((def) => {
    const saved = map.get(def.dayOfWeek);
    if (saved) {
      return {
        dayOfWeek: saved.dayOfWeek,
        startTime: saved.startTime,
        endTime: saved.endTime,
        isWorking: saved.isWorking,
      };
    }
    return { ...def };
  });
}

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

export default function ScheduleSettingsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [mode, setMode] = useState<ScheduleMode>("fixed");
  const [loading, setLoading] = useState(true);

  // Fixed schedule state
  const [rows, setRows] = useState<DayRow[]>(DEFAULT_SCHEDULE);
  const [savingFixed, setSavingFixed] = useState(false);
  const [hasFixedChanges, setHasFixedChanges] = useState(false);

  // Flexible schedule state
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [savingSlots, setSavingSlots] = useState(false);
  const [newSlots, setNewSlots] = useState<
    { date: string; startTime: string; endTime: string }[]
  >([]);

  const fetchLocations = useCallback(async () => {
    try {
      const locs = await api.get<Location[]>("/specialist/locations");
      setLocations(locs);
      if (locs.length > 0) {
        const defaultLoc = locs.find((l) => l.isDefault) ?? locs[0];
        setSelectedLocationId(defaultLoc.id);
      }
    } catch {
      toast.error("Не удалось загрузить локации");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Load fixed templates
  const fetchTemplates = useCallback(async (locationId: string) => {
    try {
      const templates = await api.get<ScheduleTemplate[]>(
        `/specialist/schedule/templates?locationId=${locationId}`,
      );
      setRows(templatesToRows(templates));
      setHasFixedChanges(false);
    } catch {
      setRows(DEFAULT_SCHEDULE);
    }
  }, []);

  // Load flexible slots
  const fetchSlots = useCallback(
    async (locationId: string, weekStartDate: Date) => {
      setLoadingSlots(true);
      try {
        const from = formatDate(weekStartDate);
        const to = formatDate(addDays(weekStartDate, 6));
        const data = await api.get<ScheduleSlot[]>(
          `/specialist/schedule/slots?locationId=${locationId}&from=${from}&to=${to}`,
        );
        setSlots(data);
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!selectedLocationId) return;
    if (mode === "fixed") {
      fetchTemplates(selectedLocationId);
    } else {
      fetchSlots(selectedLocationId, weekStart);
    }
  }, [selectedLocationId, mode, weekStart, fetchTemplates, fetchSlots]);

  // ── Fixed schedule handlers ──

  const updateRow = (dayOfWeek: number, patch: Partial<DayRow>) => {
    setRows((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...patch } : r)),
    );
    setHasFixedChanges(true);
  };

  const handleSaveFixed = async () => {
    for (const r of rows) {
      if (r.isWorking && r.startTime >= r.endTime) {
        toast.error(
          `${DAY_NAMES[r.dayOfWeek]}: время начала должно быть раньше окончания`,
        );
        return;
      }
    }
    setSavingFixed(true);
    try {
      await api.put("/specialist/schedule/templates", {
        locationId: selectedLocationId,
        templates: rows,
      });
      toast.success("Расписание сохранено");
      setHasFixedChanges(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ошибка сохранения");
    } finally {
      setSavingFixed(false);
    }
  };

  // ── Flexible schedule handlers ──

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const addNewSlot = (date: string) => {
    setNewSlots((prev) => [
      ...prev,
      { date, startTime: "09:00", endTime: "18:00" },
    ]);
  };

  const updateNewSlot = (
    idx: number,
    patch: Partial<{ startTime: string; endTime: string }>,
  ) => {
    setNewSlots((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  };

  const removeNewSlot = (idx: number) => {
    setNewSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveSlots = async () => {
    if (newSlots.length === 0) return;
    setSavingSlots(true);
    try {
      await api.put("/specialist/schedule/slots/bulk", {
        locationId: selectedLocationId,
        slots: newSlots,
      });
      toast.success("Слоты сохранены");
      setNewSlots([]);
      await fetchSlots(selectedLocationId, weekStart);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ошибка сохранения");
    } finally {
      setSavingSlots(false);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await api.delete(`/specialist/schedule/slots/${slotId}`);
      toast.success("Слот удалён");
      await fetchSlots(selectedLocationId, weekStart);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ошибка удаления");
    }
  };

  const handleCopyWeek = async () => {
    if (slots.length === 0) {
      toast.error("Нет слотов для копирования");
      return;
    }
    const nextWeek = addDays(weekStart, 7);
    const newSlotData = slots
      .filter((s) => !s.isBlocked)
      .map((s) => {
        const origDate = new Date(s.date);
        const dayOffset =
          (origDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
        const newDate = addDays(nextWeek, Math.round(dayOffset));
        return {
          date: formatDate(newDate),
          startTime: s.startTime,
          endTime: s.endTime,
        };
      });

    setSavingSlots(true);
    try {
      await api.put("/specialist/schedule/slots/bulk", {
        locationId: selectedLocationId,
        slots: newSlotData,
      });
      setWeekStart(nextWeek);
      toast.success("Расписание скопировано на следующую неделю");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ошибка копирования");
    } finally {
      setSavingSlots(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Расписание</h1>
          <p className="text-muted-foreground">Настройка рабочего графика</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="mb-4 size-12 text-muted-foreground/50" />
            <h3 className="mb-1 text-lg font-medium">
              Сначала добавьте локацию
            </h3>
            <p className="text-sm text-muted-foreground">
              Расписание привязано к конкретному адресу приёма
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Расписание</h1>
          <p className="text-muted-foreground">Настройка рабочего графика</p>
        </div>
        {mode === "fixed" && (
          <Button
            onClick={handleSaveFixed}
            disabled={savingFixed || !hasFixedChanges}
          >
            {savingFixed ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Сохранить
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {locations.length > 1 && (
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name} — {loc.city}
              </option>
            ))}
          </select>
        )}

        <div className="flex rounded-lg border border-input p-0.5">
          <button
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "fixed"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode("fixed")}
          >
            Фиксированное
          </button>
          <button
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "flexible"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode("flexible")}
          >
            Плавающее
          </button>
        </div>
      </div>

      {mode === "fixed" ? (
        <Card>
          <CardHeader>
            <CardTitle>Рабочие часы</CardTitle>
            <CardDescription>
              Укажите время работы для каждого дня недели
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.dayOfWeek}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.isWorking}
                      onChange={(e) =>
                        updateRow(row.dayOfWeek, {
                          isWorking: e.target.checked,
                        })
                      }
                      className="size-4 rounded border-input accent-primary"
                    />
                    <span
                      className={`w-12 text-sm font-medium sm:w-28 ${
                        row.isWorking ? "" : "text-muted-foreground"
                      }`}
                    >
                      <span className="sm:hidden">
                        {DAY_NAMES_SHORT[row.dayOfWeek]}
                      </span>
                      <span className="hidden sm:inline">
                        {DAY_NAMES[row.dayOfWeek]}
                      </span>
                    </span>
                  </label>
                  {row.isWorking ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={row.startTime}
                        onChange={(e) =>
                          updateRow(row.dayOfWeek, {
                            startTime: e.target.value,
                          })
                        }
                        className="w-28"
                      />
                      <span className="text-muted-foreground">—</span>
                      <Input
                        type="time"
                        value={row.endTime}
                        onChange={(e) =>
                          updateRow(row.dayOfWeek, { endTime: e.target.value })
                        }
                        className="w-28"
                      />
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Выходной
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium">
              {weekDates[0].toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
              })}{" "}
              —{" "}
              {weekDates[6].toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyWeek}
                disabled={savingSlots || slots.length === 0}
              >
                <Copy className="mr-1.5 size-3.5" />
                Копировать на след. неделю
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekStart(addDays(weekStart, 7))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          {/* Slots by day */}
          {loadingSlots ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {weekDates.map((date) => {
                const dateStr = formatDate(date);
                const daySlots = slots.filter(
                  (s) => s.date.slice(0, 10) === dateStr,
                );
                const dayNewSlots = newSlots
                  .map((s, i) => ({ ...s, idx: i }))
                  .filter((s) => s.date === dateStr);

                return (
                  <Card key={dateStr}>
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {DAY_NAMES_SHORT[date.getDay()]}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {date.toLocaleDateString("ru-RU", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addNewSlot(dateStr)}
                        >
                          <Plus className="mr-1 size-3.5" />
                          Слот
                        </Button>
                      </div>

                      {daySlots.length === 0 && dayNewSlots.length === 0 && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Нет рабочих слотов
                        </p>
                      )}

                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="mt-2 flex items-center gap-2 rounded border px-3 py-2"
                        >
                          <span className="text-sm">
                            {slot.startTime} — {slot.endTime}
                          </span>
                          {slot.isBlocked && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                              Заблокирован
                            </span>
                          )}
                          <div className="flex-1" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteSlot(slot.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}

                      {dayNewSlots.map((ns) => (
                        <div
                          key={ns.idx}
                          className="mt-2 flex items-center gap-2 rounded border border-dashed border-primary/50 px-3 py-2"
                        >
                          <Input
                            type="time"
                            value={ns.startTime}
                            onChange={(e) =>
                              updateNewSlot(ns.idx, {
                                startTime: e.target.value,
                              })
                            }
                            className="w-24"
                          />
                          <span className="text-muted-foreground">—</span>
                          <Input
                            type="time"
                            value={ns.endTime}
                            onChange={(e) =>
                              updateNewSlot(ns.idx, {
                                endTime: e.target.value,
                              })
                            }
                            className="w-24"
                          />
                          <div className="flex-1" />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => removeNewSlot(ns.idx)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {newSlots.length > 0 && (
            <Button onClick={handleSaveSlots} disabled={savingSlots}>
              {savingSlots && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              <Save className="mr-2 size-4" />
              Сохранить слоты ({newSlots.length})
            </Button>
          )}
        </>
      )}
    </div>
  );
}
