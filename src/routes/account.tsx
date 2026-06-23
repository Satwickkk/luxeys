import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useAuth } from "@/lib/auth";
import { useWishlist } from "@/lib/wishlist";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "My Profile — LYS" }] }),
  component: AccountPage,
});

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  date_of_birth: string | null;
  marketing_opt_in: boolean;
};

function AccountPage() {
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { ids: wishlistIds } = useWishlist();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const profile = useQuery({
    queryKey: ["profile", user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as ProfileRow | null) ?? null;
    },
  });

  const orders = useQuery({
    queryKey: ["my-orders", user?.id ?? null],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total, currency, created_at, order_items(product_name, quantity)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-cornsilk">
        <SiteHeader />
        <div className="max-w-3xl mx-auto px-6 py-24 opacity-70 text-center">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cornsilk">
      <SiteHeader />
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-16">
        <div className="flex items-baseline justify-between mb-10 flex-wrap gap-4">
          <div>
            <span className="eyebrow text-bronze/70">My Profile</span>
            <h1 className="font-serif italic text-4xl md:text-5xl mt-3">
              {profile.data?.full_name || user.email}
            </h1>
            <p className="text-sm opacity-60 mt-2">
              {user.email} · {roles.length ? roles.join(", ") : "customer"}
            </p>
          </div>
          <button
            onClick={signOut}
            className="text-xs uppercase tracking-widest border-b border-bronze pb-1 hover:text-bronze"
          >
            Sign out
          </button>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-8 flex flex-wrap h-auto bg-bronze/5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="address">Address</TabsTrigger>
            <TabsTrigger value="orders">Orders ({orders.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="wishlist">Wishlist ({wishlistIds.size})</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileForm userId={user.id} profile={profile.data} loading={profile.isLoading} onSaved={() => queryClient.invalidateQueries({ queryKey: ["profile"] })} section="profile" />
          </TabsContent>

          <TabsContent value="address">
            <ProfileForm userId={user.id} profile={profile.data} loading={profile.isLoading} onSaved={() => queryClient.invalidateQueries({ queryKey: ["profile"] })} section="address" />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersList orders={orders.data ?? []} loading={orders.isLoading} />
          </TabsContent>

          <TabsContent value="wishlist">
            <WishlistTab />
          </TabsContent>

          <TabsContent value="security">
            <SecurityTab email={user.email ?? ""} />
          </TabsContent>

          <TabsContent value="preferences">
            <ProfileForm userId={user.id} profile={profile.data} loading={profile.isLoading} onSaved={() => queryClient.invalidateQueries({ queryKey: ["profile"] })} section="preferences" />
          </TabsContent>
        </Tabs>
      </div>
      <SiteFooter />
    </div>
  );
}

function ProfileForm({
  userId,
  profile,
  loading,
  onSaved,
  section,
}: {
  userId: string;
  profile: ProfileRow | null | undefined;
  loading: boolean;
  onSaved: () => void;
  section: "profile" | "address" | "preferences";
}) {
  const [form, setForm] = useState<Partial<ProfileRow>>({});

  useEffect(() => {
    setForm(profile ?? {});
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        id: userId,
        full_name: form.full_name ?? null,
        phone: form.phone ?? null,
        avatar_url: form.avatar_url ?? null,
        address_line1: form.address_line1 ?? null,
        address_line2: form.address_line2 ?? null,
        city: form.city ?? null,
        state: form.state ?? null,
        postal_code: form.postal_code ?? null,
        country: form.country ?? null,
        date_of_birth: form.date_of_birth || null,
        marketing_opt_in: !!form.marketing_opt_in,
      };
      const { error } = await supabase.from("profiles").upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      onSaved();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  if (loading) return <p className="opacity-60">Loading…</p>;

  function set<K extends keyof ProfileRow>(k: K, v: ProfileRow[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="border border-bronze/15 p-8 space-y-6 bg-white/40"
    >
      {section === "profile" && (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <Field label="Full name">
              <Input value={form.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} maxLength={100} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} maxLength={30} />
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => set("date_of_birth", e.target.value)} />
            </Field>
            <Field label="Avatar URL">
              <Input value={form.avatar_url ?? ""} onChange={(e) => set("avatar_url", e.target.value)} placeholder="https://…" />
            </Field>
          </div>
          {form.avatar_url && (
            <img src={form.avatar_url} alt="Avatar preview" className="h-20 w-20 rounded-full object-cover border border-bronze/20" />
          )}
        </>
      )}

      {section === "address" && (
        <div className="grid md:grid-cols-2 gap-6">
          <Field label="Address line 1" className="md:col-span-2">
            <Input value={form.address_line1 ?? ""} onChange={(e) => set("address_line1", e.target.value)} maxLength={200} />
          </Field>
          <Field label="Address line 2" className="md:col-span-2">
            <Input value={form.address_line2 ?? ""} onChange={(e) => set("address_line2", e.target.value)} maxLength={200} />
          </Field>
          <Field label="City">
            <Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} maxLength={100} />
          </Field>
          <Field label="State / Region">
            <Input value={form.state ?? ""} onChange={(e) => set("state", e.target.value)} maxLength={100} />
          </Field>
          <Field label="Postal code">
            <Input value={form.postal_code ?? ""} onChange={(e) => set("postal_code", e.target.value)} maxLength={20} />
          </Field>
          <Field label="Country">
            <Input value={form.country ?? ""} onChange={(e) => set("country", e.target.value)} maxLength={100} />
          </Field>
        </div>
      )}

      {section === "preferences" && (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={!!form.marketing_opt_in}
            onChange={(e) => set("marketing_opt_in", e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block font-medium">Marketing emails</span>
            <span className="text-sm opacity-70">Receive news on new collections and exclusive offers.</span>
          </span>
        </label>
      )}

      <div className="pt-2">
        <Button type="submit" disabled={save.isPending} className="bg-bronze text-cornsilk hover:bg-bronze-dark uppercase tracking-widest text-xs">
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase tracking-widest opacity-70">{label}</Label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

type OrderRow = {
  id: string;
  status: string;
  total: number | string;
  currency: string | null;
  created_at: string;
  order_items: { product_name: string; quantity: number }[];
};

function OrdersList({ orders, loading }: { orders: OrderRow[]; loading: boolean }) {
  if (loading) return <p className="opacity-60">Loading…</p>;
  if (orders.length === 0) {
    return (
      <div className="border border-bronze/15 p-10 text-center">
        <p className="opacity-70 mb-6">You haven't placed an order yet.</p>
        <Link
          to="/shop"
          className="inline-block bg-bronze text-cornsilk px-8 py-4 text-xs uppercase tracking-[0.2em] hover:bg-bronze-dark transition-colors"
        >
          Start shopping
        </Link>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-bronze/15 border border-bronze/15 bg-white/40">
      {orders.map((o) => (
        <li key={o.id} className="py-6 px-6 flex flex-wrap justify-between gap-4">
          <div>
            <p className="font-serif text-lg">Order #{o.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-xs uppercase tracking-widest opacity-60 mt-1">
              {new Date(o.created_at).toLocaleDateString()} · {o.status}
            </p>
            <p className="text-sm opacity-80 mt-2">
              {o.order_items.map((i) => `${i.product_name} × ${i.quantity}`).join(", ")}
            </p>
          </div>
          <p className="font-serif text-lg">{formatPrice(Number(o.total), o.currency ?? "INR")}</p>
        </li>
      ))}
    </ul>
  );
}

function WishlistTab() {
  const { ids } = useWishlist();
  if (ids.size === 0) {
    return (
      <div className="border border-bronze/15 p-10 text-center">
        <p className="opacity-70 mb-6">Your wishlist is empty.</p>
        <Link to="/shop" className="inline-block bg-bronze text-cornsilk px-8 py-4 text-xs uppercase tracking-[0.2em] hover:bg-bronze-dark">
          Browse the shop
        </Link>
      </div>
    );
  }
  return (
    <div className="border border-bronze/15 p-8 text-center bg-white/40">
      <p className="opacity-80 mb-6">You have {ids.size} item{ids.size === 1 ? "" : "s"} saved.</p>
      <Link to="/wishlist" className="inline-block bg-bronze text-cornsilk px-8 py-4 text-xs uppercase tracking-[0.2em] hover:bg-bronze-dark">
        View wishlist
      </Link>
    </div>
  );
}

function SecurityTab({ email }: { email: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPassword("");
    setConfirm("");
  }

  async function sendReset() {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Reset email sent");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={changePassword} className="border border-bronze/15 p-8 space-y-6 bg-white/40">
        <h3 className="font-serif text-xl">Change password</h3>
        <Field label="New password">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required />
        </Field>
        <Button type="submit" disabled={busy} className="bg-bronze text-cornsilk hover:bg-bronze-dark uppercase tracking-widest text-xs">
          {busy ? "Updating…" : "Update password"}
        </Button>
      </form>

      <div className="border border-bronze/15 p-8 bg-white/40">
        <h3 className="font-serif text-xl mb-2">Forgot password?</h3>
        <p className="text-sm opacity-70 mb-4">We'll email a reset link to {email}.</p>
        <Button type="button" onClick={sendReset} variant="outline" className="uppercase tracking-widest text-xs">
          Send reset email
        </Button>
      </div>
    </div>
  );
}
