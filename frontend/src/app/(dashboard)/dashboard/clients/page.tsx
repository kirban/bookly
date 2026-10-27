import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function ClientsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Клиенты</h1>
        <p className="text-muted-foreground">
          Управление базой клиентов
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="mb-1 text-lg font-medium">Клиентов пока нет</h3>
          <p className="text-sm text-muted-foreground">
            Клиенты появятся здесь после первых записей
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
