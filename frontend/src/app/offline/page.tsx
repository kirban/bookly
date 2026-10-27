import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <WifiOff className="mb-4 size-12 text-muted-foreground" />
      <h1 className="text-xl font-semibold">Нет подключения к интернету</h1>
      <p className="mt-2 text-center text-muted-foreground">
        Проверьте соединение и попробуйте снова.
      </p>
    </div>
  );
}
