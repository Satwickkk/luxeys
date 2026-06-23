import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type WishlistContextValue = {
  ids: Set<string>;
  loading: boolean;
  has: (productId: string) => boolean;
  toggle: (productId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  async function refresh() {
    if (!user) {
      setIds(new Set());
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("wishlist").select("product_id").eq("user_id", user.id);
    setIds(new Set((data ?? []).map((r) => r.product_id)));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      ids,
      loading,
      has: (id) => ids.has(id),
      refresh,
      async toggle(productId) {
        if (!user) throw new Error("Sign in to save favourites");
        if (ids.has(productId)) {
          const next = new Set(ids);
          next.delete(productId);
          setIds(next);
          await supabase.from("wishlist").delete().eq("user_id", user.id).eq("product_id", productId);
        } else {
          const next = new Set(ids);
          next.add(productId);
          setIds(next);
          await supabase.from("wishlist").insert({ user_id: user.id, product_id: productId });
        }
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids, loading, user?.id],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within <WishlistProvider>");
  return ctx;
}
