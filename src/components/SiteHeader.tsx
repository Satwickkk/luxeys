import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useWishlist } from "@/lib/wishlist";

export function SiteHeader() {
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const { ids } = useWishlist();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    navigate({ to: "/shop", search: term ? { q: term } : {} });
  }

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between gap-4 px-6 md:px-10 py-5 bg-cornsilk/85 backdrop-blur-sm border-b border-bronze/10">
      <div className="flex gap-10 items-center">
        <Link to="/" className="font-serif text-2xl font-bold tracking-tight text-bronze">
          LYS.
        </Link>
        <div className="hidden md:flex gap-7 eyebrow font-medium">
          <Link to="/shop" className="hover:text-bronze transition-colors">
            New Arrivals
          </Link>
          <Link
            to="/shop"
            search={{ category: "linen" }}
            className="hover:text-bronze transition-colors"
          >
            Collections
          </Link>
          <Link to="/shop" className="hover:text-bronze transition-colors">
            The Edit
          </Link>
        </div>
      </div>

      <form onSubmit={onSearch} className="hidden md:block flex-1 max-w-xs">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="w-full bg-transparent border-b border-bronze/30 px-1 py-1 text-sm focus:outline-none focus:border-bronze placeholder:text-bronze/40"
        />
      </form>

      <div className="flex items-center gap-5">
        <Link
          to={user ? "/account" : "/auth"}
          className="hidden sm:inline text-xs uppercase tracking-widest hover:text-bronze transition-colors"
        >
          {user ? "Account" : "Sign in"}
        </Link>
        {isAdmin && (
          <Link
            to="/admin"
            className="hidden sm:inline text-xs uppercase tracking-widest text-bronze hover:underline"
          >
            Admin
          </Link>
        )}
        <Link
          to="/wishlist"
          className="text-xs uppercase tracking-widest hover:text-bronze transition-colors"
        >
          ♥ {ids.size > 0 ? `(${ids.size})` : ""}
        </Link>
        <Link
          to="/cart"
          className="text-xs uppercase tracking-widest hover:text-bronze transition-colors"
        >
          Cart ({count})
        </Link>
      </div>
    </nav>
  );
}
