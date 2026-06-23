import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { resolveProductImage } from "@/lib/product-images";
import { formatPrice } from "@/lib/format";
import { useWishlist } from "@/lib/wishlist";
import { useAuth } from "@/lib/auth";

export type ProductCardProps = {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency?: string;
  image_url: string | null;
};

export function ProductCard(p: ProductCardProps) {
  const src = resolveProductImage(p.image_url);
  const { has, toggle } = useWishlist();
  const { user } = useAuth();
  const saved = has(p.id);

  async function onHeart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Sign in to save favourites");
      return;
    }
    try {
      await toggle(p.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update wishlist");
    }
  }

  return (
    <Link to="/product/$slug" params={{ slug: p.slug }} className="group block">
      <div className="relative aspect-[3/4] mb-4 bg-tea/20 overflow-hidden">
        {src ? (
          <img
            src={src}
            alt={p.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full grid place-items-center eyebrow text-bronze/40">Image</div>
        )}
        <button
          onClick={onHeart}
          aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
          className={`absolute top-3 right-3 w-9 h-9 grid place-items-center rounded-full bg-cornsilk/85 backdrop-blur-sm hover:bg-cornsilk transition-colors text-lg ${
            saved ? "text-bronze" : "text-bronze/40 hover:text-bronze"
          }`}
        >
          {saved ? "♥" : "♡"}
        </button>
      </div>
      <h3 className="font-serif text-lg leading-snug">{p.name}</h3>
      <p className="text-sm opacity-70 mt-1 tracking-wide">
        {formatPrice(p.price, p.currency ?? "INR")}
      </p>
    </Link>
  );
}
