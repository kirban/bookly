import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function NotificationsSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Уведомления</h1>
        <p className="text-muted-foreground">
          Настройка уведомлений и напоминаний
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Настройки уведомлений</CardTitle>
          <CardDescription>Выберите, какие уведомления вы хотите получать</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bell className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-1 text-lg font-medium">Скоро</h3>
          <p className="text-sm text-muted-foreground">
            Настройка уведомлений будет доступна в ближайшее время
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
