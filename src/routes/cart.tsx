import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/lib/cart";
import { resolveProductImage } from "@/lib/product-images";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your Bag — LYS" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, setQty, remove } = useCart();

  return (
    <div className="min-h-screen bg-cornsilk">
      <SiteHeader />
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-16">
        <h1 className="font-serif text-4xl md:text-5xl italic mb-12">Your Bag</h1>

        {items.length === 0 ? (
          <div className="py-24 text-center">
            <p className="opacity-70 mb-8">Your bag is empty.</p>
            <Link
              to="/shop"
              className="inline-block bg-bronze text-cornsilk px-8 py-4 text-xs uppercase tracking-[0.2em] hover:bg-bronze-dark transition-colors"
            >
              Browse the collection
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-12">
            <ul className="divide-y divide-bronze/10">
              {items.map((i) => {
                const src = resolveProductImage(i.image_url);
                return (
                  <li key={i.productId} className="py-6 flex gap-6">
                    <Link
                      to="/product/$slug"
                      params={{ slug: i.slug }}
                      className="block w-24 h-32 bg-tea/20 overflow-hidden shrink-0"
                    >
                      {src && <img src={src} alt={i.name} className="w-full h-full object-cover" />}
                    </Link>
                    <div className="flex-1 flex flex-col">
                      <Link
                        to="/product/$slug"
                        params={{ slug: i.slug }}
                        className="font-serif text-lg hover:text-bronze"
                      >
                        {i.name}
                      </Link>
                      <p className="text-sm opacity-70 mt-1">{formatPrice(i.price)}</p>
                      <div className="mt-auto flex items-center gap-4">
                        <div className="inline-flex items-center border border-bronze/30">
                          <button
                            onClick={() => setQty(i.productId, i.quantity - 1)}
                            className="px-3 py-1 hover:bg-tea"
                            aria-label="Decrease quantity"
                          >
                            −
                          </button>
                          <span className="px-4 text-sm">{i.quantity}</span>
                          <button
                            onClick={() => setQty(i.productId, i.quantity + 1)}
                            className="px-3 py-1 hover:bg-tea"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => remove(i.productId)}
                          className="text-xs uppercase tracking-widest opacity-60 hover:opacity-100 hover:text-bronze"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <p className="font-serif">{formatPrice(i.price * i.quantity)}</p>
                  </li>
                );
              })}
            </ul>

            <aside className="bg-tea/20 p-8 h-fit">
              <h2 className="font-serif text-2xl mb-6">Summary</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between opacity-70">
                  <dt>Shipping</dt>
                  <dd>Calculated at checkout</dd>
                </div>
              </dl>
              <div className="border-t border-bronze/20 my-6" />
              <div className="flex justify-between font-serif text-lg mb-8">
                <span>Total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <Link
                to="/checkout"
                className="block text-center bg-bronze text-cornsilk px-8 py-4 text-xs uppercase tracking-[0.2em] hover:bg-bronze-dark transition-colors"
              >
                Proceed to checkout
              </Link>
            </aside>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
