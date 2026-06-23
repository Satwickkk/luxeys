import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";

const search = z.object({
  category: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Shop — LYS" },
      { name: "description", content: "Browse the full LYS collection of silks, linens, tailoring and accessories." },
      { property: "og:title", content: "Shop — LYS" },
      { property: "og:description", content: "Browse the full LYS collection." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { category, q } = Route.useSearch();

  const cats = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const products = useQuery({
    queryKey: ["products", category ?? null, q ?? null],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, slug, name, price, currency, image_url, categories!inner(slug)")
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (category) query = query.eq("categories.slug", category);
      if (q && q.trim()) query = query.ilike("name", `%${q.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-cornsilk text-foreground">
      <SiteHeader />

      <header className="px-6 md:px-10 pt-16 pb-10 max-w-7xl mx-auto">
        <span className="eyebrow text-bronze/70">The Collection</span>
        <h1 className="font-serif italic text-5xl md:text-6xl mt-4">
          {category ? cats.data?.find((c) => c.slug === category)?.name ?? "Shop" : "Shop all"}
        </h1>
      </header>

      <div className="px-6 md:px-10 max-w-7xl mx-auto flex flex-wrap gap-3 mb-12">
        <Link
          to="/shop"
          className={`px-5 py-2 rounded-full text-xs uppercase tracking-widest border transition-colors ${
            !category ? "bg-bronze text-cornsilk border-bronze" : "border-bronze/20 hover:bg-tea"
          }`}
        >
          All
        </Link>
        {(cats.data ?? []).map((c) => (
          <Link
            key={c.id}
            to="/shop"
            search={{ category: c.slug }}
            className={`px-5 py-2 rounded-full text-xs uppercase tracking-widest border transition-colors ${
              category === c.slug
                ? "bg-bronze text-cornsilk border-bronze"
                : "border-bronze/20 hover:bg-tea"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <section className="px-6 md:px-10 pb-24 max-w-7xl mx-auto">
        {products.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-tea/20 animate-pulse" />
            ))}
          </div>
        ) : (products.data ?? []).length === 0 ? (
          <p className="text-center py-24 opacity-60">No products found.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {(products.data ?? []).map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                slug={p.slug}
                name={p.name}
                price={Number(p.price)}
                currency={p.currency ?? "INR"}
                image_url={p.image_url}
              />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
