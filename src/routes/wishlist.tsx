import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { useAuth } from "@/lib/auth";
import { useWishlist } from "@/lib/wishlist";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — LYS" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const { user, loading } = useAuth();
  const { ids } = useWishlist();
  const idList = Array.from(ids);

  const products = useQuery({
    queryKey: ["wishlist-products", idList.sort().join(",")],
    enabled: !!user && idList.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price, currency, image_url")
        .in("id", idList);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-cornsilk">
      <SiteHeader />
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16">
        <p className="eyebrow text-bronze/70">Saved</p>
        <h1 className="font-serif text-4xl md:text-5xl italic mt-3 mb-10">Your wishlist</h1>

        {loading ? (
          <p className="opacity-60">Loading…</p>
        ) : !user ? (
          <div className="py-16 text-center">
            <p className="opacity-70 mb-6">Sign in to save your favourite pieces.</p>
            <Link
              to="/auth"
              search={{ redirect: "/wishlist" }}
              className="inline-block bg-bronze text-cornsilk px-8 py-4 text-xs uppercase tracking-[0.2em] hover:bg-bronze-dark transition-colors"
            >
              Sign in
            </Link>
          </div>
        ) : idList.length === 0 ? (
          <div className="py-16 text-center">
            <p className="opacity-70 mb-6">Your wishlist is empty.</p>
            <Link
              to="/shop"
              className="inline-block bg-bronze text-cornsilk px-8 py-4 text-xs uppercase tracking-[0.2em] hover:bg-bronze-dark transition-colors"
            >
              Browse the shop
            </Link>
          </div>
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
      </div>
      <SiteFooter />
    </div>
  );
}
