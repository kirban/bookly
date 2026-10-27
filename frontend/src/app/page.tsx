import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Онлайн-запись",
    description: "Клиенты записываются к вам 24/7 через персональную страницу",
  },
  {
    icon: Users,
    title: "База клиентов",
    description: "Все клиенты и история визитов в одном месте",
  },
  {
    icon: Clock,
    title: "Гибкое расписание",
    description: "Настройте рабочие часы и длительность приёмов",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <span className="text-xl font-bold text-primary">Bookly</span>
          <nav className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Войти
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Начать бесплатно</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-24 text-center">
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Онлайн-запись для{" "}
            <span className="text-primary">специалистов</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Создайте персональную страницу записи за минуты. Управляйте
            расписанием, клиентами и услугами в одном месте.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Начать бесплатно
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="border-t border-border bg-card py-20">
          <div className="mx-auto grid max-w-5xl gap-8 px-6 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Bookly. Все права защищены.
      </footer>
    </div>
  );
}
