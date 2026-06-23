import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import heroImg from "@/assets/hero.jpg";
import editorialImg from "@/assets/editorial.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LYS — The Gentle Art of Being" },
      {
        name: "description",
        content:
          "Summer Collection 2026. Considered silks, linens and tailoring from LYS.",
      },
      { property: "og:title", content: "LYS — The Gentle Art of Being" },
      {
        property: "og:description",
        content: "Considered silks, linens and tailoring from LYS.",
      },
    ],
  }),
  component: HomePage,
});

const CATS = [
  { slug: "silks", label: "Silks" },
  { slug: "linen", label: "Linen" },
  { slug: "accessories", label: "Accessories" },
  { slug: "tailoring", label: "Tailoring" },
];

function HomePage() {
  const featured = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, price, currency, image_url")
        .eq("featured", true)
        .eq("active", true)
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-cornsilk text-foreground">
      <SiteHeader />

      {/* Hero */}
      <section className="relative h-[85vh] w-full overflow-hidden">
        <img
          src={heroImg}
          alt="A model in tea-green linen walking through a sunlit field"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-cornsilk/15" />
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-4 text-bronze-dark">
          <span className="eyebrow mb-4">Summer Collection 2026</span>
          <h1 className="font-serif text-6xl md:text-8xl mb-8 max-w-4xl italic leading-tight">
            The Gentle Art of Being
          </h1>
          <Link
            to="/shop"
            className="px-10 py-4 bg-bronze text-cornsilk text-xs uppercase tracking-[0.2em] hover:bg-bronze-dark transition-all duration-300"
          >
            Shop the collection
          </Link>
        </div>
      </section>

      {/* Category strip */}
      <div className="flex flex-wrap justify-center gap-4 py-12 px-8">
        {CATS.map((c) => (
          <Link
            key={c.slug}
            to="/shop"
            search={{ category: c.slug }}
            className="px-6 py-2 border border-bronze/20 rounded-full text-xs uppercase tracking-widest hover:bg-tea transition-colors"
          >
            {c.label}
          </Link>
        ))}
      </div>

      {/* Featured grid */}
      <section className="px-6 md:px-10 py-16 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-10">
          <h2 className="font-serif text-3xl md:text-4xl">Featured</h2>
          <Link
            to="/shop"
            className="text-xs uppercase tracking-widest border-b border-bronze/40 pb-1 hover:text-bronze"
          >
            View all
          </Link>
        </div>
        {featured.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-tea/20 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {(featured.data ?? []).map((p) => (
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

      {/* Editorial */}
      <section className="bg-tea/20 py-24 mt-12">
        <div className="max-w-6xl mx-auto px-6 md:px-10 flex flex-col md:flex-row items-center gap-16">
          <div className="w-full md:w-1/2">
            <img
              src={editorialImg}
              alt="A hand holding a wildflower against folded linen"
              loading="lazy"
              width={1024}
              height={1280}
              className="w-full aspect-[4/5] object-cover"
            />
          </div>
          <div className="w-full md:w-1/2 flex flex-col items-start">
            <span className="eyebrow mb-6 text-bronze/70">Provenance</span>
            <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-8 text-bronze-dark">
              Conscious craftsmanship for the modern wardrobe
            </h2>
            <p className="text-lg leading-relaxed mb-10 opacity-80">
              Every piece is curated with the philosophy that style should be permanent and
              production should be kind. We source natural fibers and work with artisanal
              collectives in the Mediterranean so every thread tells a story of respect.
            </p>
            <Link
              to="/shop"
              className="text-xs font-bold uppercase tracking-widest border-b-2 border-bronze pb-1 hover:text-bronze transition-colors"
            >
              Read our story
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
