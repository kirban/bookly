"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  Calendar,
  LogOut,
  Menu,
  CreditCard,
  MapPin,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Дашборд", href: "/dashboard", icon: LayoutDashboard },
  { name: "Клиенты", href: "/dashboard/clients", icon: Users },
  { name: "Настройки", href: "/dashboard/settings/profile", icon: Settings },
  { name: "Локации", href: "/dashboard/settings/locations", icon: MapPin },
  { name: "Услуги", href: "/dashboard/settings/services", icon: Briefcase },
  { name: "Расписание", href: "/dashboard/settings/schedule", icon: Calendar },
  { name: "Подписка", href: "/dashboard/settings/subscription", icon: CreditCard },
];

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {navigation.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/");
      return;
    }
  }, [user, isLoading, router]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            Bookly
          </Link>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          <NavLinks pathname={pathname} />
        </nav>

        <div className="mt-auto border-t border-border p-4">
          <div className="mb-3 truncate px-3 text-sm text-muted-foreground">
            {user?.email ?? "Специалист"}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6 lg:hidden">
          <Link href="/dashboard" className="text-xl font-bold text-primary">
            Bookly
          </Link>
          <div className="relative">
            <Button
              ref={menuButtonRef}
              variant="ghost"
              size="icon"
              aria-label="Меню"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            {mobileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/50"
                  aria-hidden
                  onClick={closeMobileMenu}
                />
                <div
                  className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-border bg-card shadow-lg"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="mobile-menu-title"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") closeMobileMenu();
                  }}
                >
                  <div className="flex h-16 items-center justify-between border-b border-border px-4">
                    <span id="mobile-menu-title" className="font-semibold text-primary">
                      Меню
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Закрыть"
                      onClick={closeMobileMenu}
                    >
                      ×
                    </Button>
                  </div>
                  <nav className="flex flex-col gap-1 p-4">
                    <NavLinks
                      pathname={pathname}
                      onNavigate={closeMobileMenu}
                    />
                  </nav>
                  <div className="mt-auto border-t border-border p-4">
                    <div className="mb-3 truncate px-3 text-sm text-muted-foreground">
                      {user.email}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-3 text-muted-foreground"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4" />
                      Выйти
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
