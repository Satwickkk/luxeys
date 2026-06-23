import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { ProductReviews } from "@/components/ProductReviews";
import { resolveProductImage } from "@/lib/product-images";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/product/$slug")({
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { add } = useCart();

  const product = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, description, price, currency, image_url, stock, category_id")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const related = useQuery({
    queryKey: ["product-related", product.data?.category_id ?? null, slug],
    enabled: !!product.data?.category_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price, currency, image_url")
        .eq("active", true)
        .eq("category_id", product.data!.category_id!)
        .neq("slug", slug)
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (product.isLoading) {
    return (
      <div className="min-h-screen bg-cornsilk">
        <SiteHeader />
        <div className="max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12">
          <div className="aspect-[3/4] bg-tea/20 animate-pulse" />
          <div className="space-y-4">
            <div className="h-10 bg-tea/20 animate-pulse w-2/3" />
            <div className="h-6 bg-tea/20 animate-pulse w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!product.data) {
    return (
      <div className="min-h-screen bg-cornsilk">
        <SiteHeader />
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="font-serif text-4xl mb-4">Not found</h1>
          <p className="opacity-70 mb-8">This piece is no longer available.</p>
          <Link to="/shop" className="text-xs uppercase tracking-widest border-b border-bronze pb-1">
            Return to shop
          </Link>
        </div>
      </div>
    );
  }

  const p = product.data;
  const src = resolveProductImage(p.image_url);
  const inStock = (p.stock ?? 0) > 0;

  return (
    <div className="min-h-screen bg-cornsilk text-foreground">
      <SiteHeader />

      <article className="max-w-6xl mx-auto px-6 md:px-10 py-16 grid md:grid-cols-2 gap-12 md:gap-16">
        <div className="bg-tea/20 aspect-[3/4] overflow-hidden">
          {src && (
            <img src={src} alt={p.name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex flex-col">
          <span className="eyebrow text-bronze/70 mb-3">LYS Studio</span>
          <h1 className="font-serif text-4xl md:text-5xl italic leading-tight mb-4">{p.name}</h1>
          <p className="text-xl tracking-wide mb-8">
            {formatPrice(Number(p.price), p.currency ?? "INR")}
          </p>
          <p className="opacity-80 leading-relaxed mb-10">{p.description}</p>

          <div className="flex flex-col gap-3 max-w-sm">
            <button
              disabled={!inStock}
              onClick={() => {
                add(
                  {
                    productId: p.id,
                    slug: p.slug,
                    name: p.name,
                    price: Number(p.price),
                    image_url: p.image_url,
                  },
                  1,
                );
                toast.success("Added to bag", { description: p.name });
              }}
              className="bg-bronze text-cornsilk px-8 py-4 text-xs uppercase tracking-[0.2em] hover:bg-bronze-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {inStock ? "Add to bag" : "Sold out"}
            </button>
            <button
              disabled={!inStock}
              onClick={() => {
                add(
                  {
                    productId: p.id,
                    slug: p.slug,
                    name: p.name,
                    price: Number(p.price),
                    image_url: p.image_url,
                  },
                  1,
                );
                navigate({ to: "/checkout" });
              }}
              className="border border-bronze/40 px-8 py-4 text-xs uppercase tracking-[0.2em] hover:bg-tea transition-colors disabled:opacity-50"
            >
              Buy now
            </button>
          </div>

          <p className="mt-10 text-xs uppercase tracking-widest opacity-60">
            {inStock ? `${p.stock} in stock` : "Currently unavailable"}
          </p>
        </div>
      </article>

      <ProductReviews productId={p.id} />

      {(related.data?.length ?? 0) > 0 && (
        <section className="max-w-7xl mx-auto px-6 md:px-10 py-20 border-t border-bronze/10">
          <h2 className="font-serif text-3xl mb-10">You may also like</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {related.data!.map((r) => (
              <ProductCard
                key={r.id}
                id={r.id}
                slug={r.slug}
                name={r.name}
                price={Number(r.price)}
                currency={r.currency ?? "INR"}
                image_url={r.image_url}
              />
            ))}
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
