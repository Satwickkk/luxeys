import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — LYS" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth", search: { redirect: pathname } });
    else if (!isAdmin) navigate({ to: "/" });
  }, [loading, user, isAdmin, navigate, pathname]);

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cornsilk">
        <p className="eyebrow opacity-60">Verifying access…</p>
      </div>
    );
  }

  const tabs: { to: string; label: string; show: boolean }[] = [
    { to: "/admin", label: "Overview", show: true },
    { to: "/admin/products", label: "Products", show: true },
    { to: "/admin/categories", label: "Categories", show: true },
    { to: "/admin/orders", label: "Orders", show: true },
    { to: "/admin/users", label: "Users & Roles", show: isSuperAdmin },
  ];

  return (
    <div className="min-h-screen bg-cornsilk text-foreground">
      <header className="border-b border-bronze/15 bg-cornsilk/90 backdrop-blur sticky top-0 z-40">
        <div className="px-6 md:px-10 py-5 flex items-center justify-between">
          <Link to="/" className="font-serif text-2xl text-bronze">LYS.</Link>
          <div className="flex items-center gap-3 text-xs uppercase tracking-widest">
            <span className="opacity-60">{isSuperAdmin ? "Super admin" : "Admin"}</span>
            <Link to="/" className="hover:text-bronze">Storefront →</Link>
          </div>
        </div>
        <nav className="px-6 md:px-10 flex gap-6 overflow-x-auto">
          {tabs.filter((t) => t.show).map((t) => (
            <Link
              key={t.to}
              to={t.to}
              activeOptions={{ exact: t.to === "/admin" }}
              activeProps={{ className: "text-bronze border-bronze" }}
              className="py-3 text-xs uppercase tracking-[0.18em] border-b-2 border-transparent hover:text-bronze transition-colors whitespace-nowrap"
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="px-6 md:px-10 py-10 max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
