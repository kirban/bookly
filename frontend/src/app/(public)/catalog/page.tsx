import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Каталог специалистов — Bookly",
  description:
    "Найдите специалиста рядом и запишитесь онлайн. Поиск по городам и категориям.",
};

interface CatalogEntry {
  id: string;
  firstName: string;
  lastName: string;
  slug: string | null;
  specialization: string | null;
  avatarUrl: string | null;
  city: string | null;
  servicesCount: number;
}

interface CatalogResponse {
  data: CatalogEntry[];
  meta: { page: number; totalPages: number; total: number };
}

async function getCatalog(params: {
  city?: string;
  category?: string;
  page?: string;
}): Promise<CatalogResponse> {
  const sp = new URLSearchParams();
  if (params.city) sp.set("city", params.city);
  if (params.category) sp.set("category", params.category);
  if (params.page) sp.set("page", params.page);

  const apiUrl = process.env.INTERNAL_API_URL ?? "http://localhost:4000";
  const res = await fetch(`${apiUrl}/public/catalog?${sp}`, {
    next: { revalidate: 60 },
  });

  if (!res.ok) return { data: [], meta: { page: 1, totalPages: 0, total: 0 } };
  return res.json();
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const { data, meta } = await getCatalog(params);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Каталог специалистов</h1>
      <p className="mt-1 text-muted-foreground">
        Найдите специалиста и запишитесь онлайн
      </p>

      <form className="mt-6 flex flex-wrap gap-3">
        <input
          name="city"
          placeholder="Город"
          defaultValue={params.city ?? ""}
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          name="category"
          placeholder="Специализация"
          defaultValue={params.category ?? ""}
          className="rounded-md border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Найти
        </button>
      </form>

      {data.length === 0 ? (
        <p className="mt-10 text-center text-muted-foreground">
          Специалисты не найдены
        </p>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((s) => (
              <Link
                key={s.id}
                href={s.slug ? `/${s.slug}` : "#"}
                className="flex gap-3 rounded-lg border p-4 transition hover:shadow-md"
              >
                <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold">
                  {s.avatarUrl ? (
                    <img
                      src={s.avatarUrl}
                      alt=""
                      className="size-12 rounded-full object-cover"
                    />
                  ) : (
                    (s.firstName?.[0] ?? "?")
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-medium">
                    {s.firstName} {s.lastName}
                  </div>
                  {s.specialization && (
                    <div className="text-xs text-muted-foreground">
                      {s.specialization}
                    </div>
                  )}
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {s.city && <span>{s.city}</span>}
                    <span>{s.servicesCount} услуг</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <Link
                    key={p}
                    href={`/catalog?${new URLSearchParams({ ...params, page: String(p) })}`}
                    className={`rounded px-3 py-1 text-sm ${
                      p === meta.page
                        ? "bg-primary text-primary-foreground"
                        : "border"
                    }`}
                  >
                    {p}
                  </Link>
                ),
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
