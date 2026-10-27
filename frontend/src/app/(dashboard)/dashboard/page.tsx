"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Phone,
  MapPin,
  Clock,
} from "lucide-react";
import type { EventInput, EventClickArg, DateSelectArg, EventDropArg, DatesSetArg } from "@fullcalendar/core";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { io, Socket } from "socket.io-client";

interface Location {
  id: string;
  name: string;
  city: string;
}

interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: string | null;
  isActive: boolean;
}

interface ClientSuggestion {
  id: string;
  name: string;
  phone: string;
}

interface Appointment {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  client: { name: string; phone: string };
  service: { name: string; durationMinutes: number; price: string | null };
  location: { name: string; city: string; address: string };
}

interface HistoryEntry {
  id: string;
  action: string;
  oldDate: string | null;
  oldStartTime: string | null;
  performedBy: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  created: "Создана",
  rescheduled: "Перенесена",
  cancelled: "Отменена",
  confirmed: "Подтверждена",
  completed: "Завершена",
  no_show: "Неявка",
};

const STATUS_BG: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#22c55e",
  cancelled: "#ef4444",
  completed: "#9ca3af",
  no_show: "#f97316",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  confirmed: "Подтверждена",
  cancelled: "Отменена",
  completed: "Завершена",
  no_show: "Неявка",
};

function toEvents(appointments: Appointment[]): EventInput[] {
  return appointments.map((a) => {
    const dateStr = a.date.slice(0, 10);
    return {
      id: a.id,
      title: `${a.client.name} — ${a.service.name}`,
      start: `${dateStr}T${a.startTime}`,
      end: `${dateStr}T${a.endTime}`,
      backgroundColor: STATUS_BG[a.status] ?? "#6b7280",
      borderColor: STATUS_BG[a.status] ?? "#6b7280",
      extendedProps: a,
    };
  });
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type CalView = "timeGridDay" | "timeGridWeek" | "dayGridMonth";
const VIEW_LABELS: Record<CalView, string> = {
  timeGridDay: "День",
  timeGridWeek: "Неделя",
  dayGridMonth: "Месяц",
};

function getSavedView(): CalView {
  if (typeof window === "undefined") return "timeGridDay";
  return (localStorage.getItem("bookly_cal_view") as CalView) || "timeGridDay";
}

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calView, setCalView] = useState<CalView>(getSavedView);
  const [visibleRange, setVisibleRange] = useState<{ from: string; to: string } | null>(null);

  // Detail panel
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("10:00");
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef({ name: "", phone: "" });

  const DEBOUNCE_MS = 1000;

  const debouncedSearchClients = useCallback((name: string, phone: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    latestQueryRef.current = { name, phone };
    searchTimeoutRef.current = setTimeout(() => {
      searchTimeoutRef.current = null;
      const q = (latestQueryRef.current.name.trim() || latestQueryRef.current.phone.trim()) || "";
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      api
        .get<ClientSuggestion[]>(`/appointments/search-clients?q=${encodeURIComponent(q)}`)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const fetchMeta = useCallback(async () => {
    try {
      const [locs, svcs] = await Promise.all([
        api.get<Location[]>("/specialist/locations"),
        api.get<Service[]>("/specialist/services"),
      ]);
      setLocations(locs);
      const active = svcs.filter((s) => s.isActive);
      setServices(active);
      if (locs.length > 0) setSelectedLocation(locs[0].id);
      if (active.length > 0) setSelectedService(active[0].id);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  const fetchAppointments = useCallback(async (from: string, to: string) => {
    try {
      const data = await api.get<Appointment[]>(
        `/appointments?from=${from}&to=${to}`,
      );
      setAppointments(data);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if (visibleRange) {
      fetchAppointments(visibleRange.from, visibleRange.to);
    }
  }, [visibleRange, fetchAppointments]);

  const refreshAppointments = useCallback(async () => {
    if (visibleRange) {
      await fetchAppointments(visibleRange.from, visibleRange.to);
    }
  }, [visibleRange, fetchAppointments]);

  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    const socket = io(`${apiUrl}/appointments`, {
      query: { specialistId: user.id },
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on("appointment:created", (data: Appointment) => {
      setAppointments((prev) => [...prev, data]);
      toast.success(`Новая запись: ${data.client.name} на ${data.startTime}`);
    });

    socket.on("appointment:updated", (data: Appointment) => {
      setAppointments((prev) =>
        prev.map((a) => (a.id === data.id ? data : a)),
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id]);

  const navigate = (dir: "prev" | "next" | "today") => {
    if (dir === "today") setCurrentDate(new Date());
    else if (dir === "prev") setCurrentDate((d) => addDays(d, -1));
    else setCurrentDate((d) => addDays(d, 1));
  };

  const handleEventClick = (info: EventClickArg) => {
    const appt = info.event.extendedProps as Appointment;
    setSelectedAppt(appt);
    setHistory([]);
    setHistoryOpen(false);
  };

  const handleDateSelect = (info: DateSelectArg) => {
    const d = info.start;
    setSelectedDate(d.toISOString().slice(0, 10));
    setSelectedTime(
      `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    );
    setDialogOpen(true);
  };

  const handleEventDrop = async (info: EventDropArg) => {
    const appt = info.event.extendedProps as Appointment;
    const newStart = info.event.start;
    if (!newStart) {
      info.revert();
      return;
    }

    const newDate = newStart.toISOString().slice(0, 10);
    const newTime = `${String(newStart.getHours()).padStart(2, "0")}:${String(newStart.getMinutes()).padStart(2, "0")}`;

    try {
      await api.patch(`/appointments/${appt.id}/reschedule`, {
        newDate,
        newStartTime: newTime,
      });
      toast.success(
        `Перенесено на ${newTime}`,
      );
      await refreshAppointments();
    } catch (err) {
      info.revert();
      toast.error(err instanceof ApiError ? err.message : "Ошибка переноса");
    }
  };

  const handleCreate = async () => {
    if (!clientName || !clientPhone || !selectedService || !selectedLocation) {
      toast.error("Заполните все обязательные поля");
      return;
    }
    setSaving(true);
    try {
      await api.post("/appointments", {
        clientName,
        clientPhone,
        serviceId: selectedService,
        locationId: selectedLocation,
        date: selectedDate || toLocalDateString(currentDate),
        startTime: selectedTime,
      });
      toast.success("Запись создана");
      setDialogOpen(false);
      setClientName("");
      setClientPhone("");
      setSuggestions([]);
      await refreshAppointments();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Ошибка создания");
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = currentDate.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100svh-5rem)] gap-4">
      {/* Calendar */}
      <div className="flex flex-1 flex-col">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate("prev")}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("today")}>
              Сегодня
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate("next")}>
              <ChevronRight className="size-4" />
            </Button>
            <span className="ml-2 text-sm font-medium capitalize">{dateLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border">
              {(Object.entries(VIEW_LABELS) as [CalView, string][]).map(
                ([v, label]) => (
                  <button
                    key={v}
                    onClick={() => {
                      setCalView(v);
                      localStorage.setItem("bookly_cal_view", v);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      calView === v
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    } ${v === "timeGridDay" ? "rounded-l-md" : ""} ${v === "dayGridMonth" ? "rounded-r-md" : ""}`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
            <Button
              onClick={() => {
                setSelectedDate(currentDate.toISOString().slice(0, 10));
                setSelectedTime("10:00");
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 size-4" />
              Новая запись
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded-lg border bg-card [&_.fc]:h-full [&_.fc-timegrid-slot]:!h-10 [&_.fc-event]:cursor-pointer [&_.fc-event]:rounded [&_.fc-event]:px-1.5 [&_.fc-event]:text-xs [&_.fc-col-header-cell]:py-2 [&_.fc-col-header-cell]:text-sm [&_.fc-col-header-cell]:font-medium [&_.fc-timegrid-slot-label]:text-xs [&_.fc-timegrid-slot-label]:text-muted-foreground">
          <FullCalendar
            key={`${calView}-${currentDate.toISOString().slice(0, 10)}`}
            plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
            initialView={calView}
            initialDate={currentDate}
            headerToolbar={false}
            locale="ru"
            firstDay={1}
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:15:00"
            slotLabelInterval="01:00:00"
            allDaySlot={false}
            selectable={calView !== "dayGridMonth"}
            selectMirror
            editable={calView !== "dayGridMonth"}
            height="100%"
            events={toEvents(appointments)}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            select={handleDateSelect}
            nowIndicator
            datesSet={(info: DatesSetArg) => {
              const from = info.start.toISOString().slice(0, 10);
              const to = info.end.toISOString().slice(0, 10);
              setVisibleRange((prev) =>
                prev?.from === from && prev?.to === to ? prev : { from, to },
              );
              setCurrentDate(info.view.currentStart);
            }}
            dateClick={(info) => {
              if (calView === "dayGridMonth") {
                setCurrentDate(info.date);
                setCalView("timeGridDay");
                localStorage.setItem("bookly_cal_view", "timeGridDay");
              }
            }}
          />
        </div>
      </div>

      {/* Slide-over detail panel */}
      {selectedAppt && (
        <div className="w-80 shrink-0 overflow-auto rounded-lg border bg-card p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Детали записи</h3>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setSelectedAppt(null)}
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-lg font-medium">{selectedAppt.client.name}</p>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Phone className="size-3.5" />
                {selectedAppt.client.phone}
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="size-3.5 text-muted-foreground" />
                {selectedAppt.startTime} — {selectedAppt.endTime}
              </div>
              <div className="mt-1.5">{selectedAppt.service.name}</div>
              {selectedAppt.service.price && (
                <div className="text-muted-foreground">
                  {parseFloat(selectedAppt.service.price).toLocaleString("ru-RU")} ₽
                </div>
              )}
            </div>

            <div className="flex items-start gap-1.5 text-sm">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div>
                <p>{selectedAppt.location.name}</p>
                <p className="text-muted-foreground">
                  {selectedAppt.location.city}, {selectedAppt.location.address}
                </p>
              </div>
            </div>

            <div>
              <span
                className="inline-block rounded-full px-2.5 py-1 text-xs font-medium text-white"
                style={{
                  backgroundColor: STATUS_BG[selectedAppt.status] ?? "#6b7280",
                }}
              >
                {STATUS_LABELS[selectedAppt.status] ?? selectedAppt.status}
              </span>
            </div>

            {selectedAppt.notes && (
              <div className="text-sm">
                <p className="font-medium">Заметки</p>
                <p className="text-muted-foreground">{selectedAppt.notes}</p>
              </div>
            )}

            {!["cancelled", "completed", "no_show"].includes(selectedAppt.status) && (
              <div className="space-y-2 border-t pt-4">
                <Button
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    try {
                      await api.patch(`/appointments/${selectedAppt.id}/complete`);
                      toast.success("Запись завершена");
                      setSelectedAppt(null);
                      await refreshAppointments();
                    } catch {
                      toast.error("Ошибка");
                    }
                  }}
                >
                  Завершить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    try {
                      await api.patch(`/appointments/${selectedAppt.id}/no-show`);
                      toast.success("Отмечена неявка");
                      setSelectedAppt(null);
                      await refreshAppointments();
                    } catch {
                      toast.error("Ошибка");
                    }
                  }}
                >
                  Неявка
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full"
                  onClick={async () => {
                    try {
                      await api.patch(`/appointments/${selectedAppt.id}/cancel`);
                      toast.success("Запись отменена");
                      setSelectedAppt(null);
                      await refreshAppointments();
                    } catch {
                      toast.error("Ошибка");
                    }
                  }}
                >
                  Отменить
                </Button>
              </div>
            )}

            {/* History */}
            <div className="border-t pt-4">
              <button
                className="flex w-full items-center justify-between text-sm font-medium"
                onClick={async () => {
                  if (!historyOpen && history.length === 0) {
                    try {
                      const data = await api.get<HistoryEntry[]>(
                        `/appointments/${selectedAppt.id}/history`,
                      );
                      setHistory(data);
                    } catch { /* silent */ }
                  }
                  setHistoryOpen(!historyOpen);
                }}
              >
                История изменений
                <ChevronRight
                  className={`size-4 transition-transform ${historyOpen ? "rotate-90" : ""}`}
                />
              </button>
              {historyOpen && (
                <div className="mt-3 space-y-2">
                  {history.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Нет записей</p>
                  ) : (
                    history.map((h) => (
                      <div key={h.id} className="flex items-start gap-2 text-xs">
                        <div className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                        <div>
                          <span className="font-medium">
                            {ACTION_LABELS[h.action] ?? h.action}
                          </span>
                          {h.oldDate && (
                            <span className="text-muted-foreground">
                              {" "}(было: {new Date(h.oldDate).toLocaleDateString("ru-RU")} {h.oldStartTime})
                            </span>
                          )}
                          <div className="text-muted-foreground">
                            {new Date(h.createdAt).toLocaleString("ru-RU")} · {h.performedBy}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая запись</DialogTitle>
            <DialogDescription>
              Создайте запись для клиента вручную
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Имя клиента <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  value={clientName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setClientName(v);
                    debouncedSearchClients(v, clientPhone);
                  }}
                  placeholder="Иван Петров"
                />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                        onClick={() => {
                          setClientName(s.name);
                          setClientPhone(s.phone);
                          setSuggestions([]);
                        }}
                      >
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground">{s.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Телефон <span className="text-destructive">*</span>
              </Label>
              <Input
                value={clientPhone}
                onChange={(e) => {
                  const v = e.target.value;
                  setClientPhone(v);
                  debouncedSearchClients(clientName, v);
                }}
                placeholder="+7 999 123 45 67"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Услуга</Label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes} мин)
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Локация</Label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Дата</Label>
                <Input
                  type="date"
                  min={toLocalDateString(new Date())}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Время</Label>
                <Input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  step={900}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Создать запись
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
