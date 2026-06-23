import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay.functions";

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — LYS" }] }),
  component: CheckoutPage,
});

type Form = {
  full_name: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [method, setMethod] = useState<"razorpay" | "cod">("razorpay");
  const createOrder = useServerFn(createRazorpayOrder);
  const verifyPayment = useServerFn(verifyRazorpayPayment);
  const [form, setForm] = useState<Form>({
    full_name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "IN",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth", search: { redirect: "/checkout" } });
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-cornsilk">
        <SiteHeader />
        <div className="max-w-3xl mx-auto px-6 py-24 text-center opacity-70">Loading…</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-cornsilk">
        <SiteHeader />
        <div className="max-w-3xl mx-auto px-6 py-24 text-center">
          <h1 className="font-serif text-4xl mb-4">Your bag is empty</h1>
          <Link to="/shop" className="text-xs uppercase tracking-widest border-b border-bronze pb-1">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  const shipping = subtotal >= 2000 ? 0 : 99;
  const total = subtotal + shipping;

  async function persistOrder(paymentRef: string | null, status: "placed" | "confirmed") {
    const { data: order, error: oErr } = await supabase
      .from("orders")
      .insert({
        user_id: user!.id,
        status,
        payment_method: method,
        payment_reference: paymentRef,
        subtotal,
        shipping,
        total,
        shipping_name: form.full_name,
        shipping_phone: form.phone,
        shipping_line1: form.line1,
        shipping_line2: form.line2 || null,
        shipping_city: form.city,
        shipping_state: form.state || null,
        shipping_postal_code: form.postal_code,
        shipping_country: form.country,
      })
      .select("id")
      .single();
    if (oErr || !order) throw oErr ?? new Error("Order failed");

    const { error: iErr } = await supabase.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id,
        product_id: i.productId,
        product_name: i.name,
        unit_price: i.price,
        quantity: i.quantity,
        image_url: i.image_url,
      })),
    );
    if (iErr) throw iErr;
    return order.id;
  }

  async function payWithRazorpay() {
    if (typeof window === "undefined" || !window.Razorpay) {
      throw new Error("Payment SDK not loaded. Refresh and try again.");
    }
    const rzpOrder = await createOrder({
      data: { amount: total, currency: "INR", receipt: `lys_${Date.now()}` },
    });
    return new Promise<string>((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: rzpOrder.keyId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        order_id: rzpOrder.orderId,
        name: "LYS",
        description: "Order payment",
        prefill: { name: form.full_name, contact: form.phone, email: user!.email ?? "" },
        theme: { color: "#7a5c3a" },
        method: { upi: true, card: true, netbanking: true, wallet: true },
        config: {
          display: {
            blocks: {
              upi_apps: {
                name: "Pay using UPI apps",
                instruments: [
                  { method: "upi", flows: ["intent"], apps: ["google_pay", "phonepe", "paytm", "bhim"] },
                  { method: "upi", flows: ["collect"] },
                ],
              },
              other: {
                name: "Other payment methods",
                instruments: [
                  { method: "card" },
                  { method: "netbanking" },
                  { method: "wallet" },
                ],
              },
            },
            sequence: ["block.upi_apps", "block.other"],
            preferences: { show_default_blocks: false },
          },
        },
        handler: async (resp: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await verifyPayment({
              data: {
                orderId: resp.razorpay_order_id,
                paymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
              },
            });
            resolve(resp.razorpay_payment_id);
          } catch (e) {
            reject(e);
          }
        },
        modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
      });
      rzp.open();
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      let paymentRef: string | null = null;
      let status: "placed" | "confirmed" = "placed";
      if (method === "razorpay") {
        paymentRef = await payWithRazorpay();
        status = "confirmed";
      }
      await persistOrder(paymentRef, status);
      clear();
      toast.success("Order placed", { description: "Thank you — a confirmation is on its way." });
      navigate({ to: "/account" });
    } catch (err) {
      console.error(err);
      toast.error("Could not place order", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function update<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  return (
    <div className="min-h-screen bg-cornsilk">
      <SiteHeader />
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-16">
        <h1 className="font-serif text-4xl md:text-5xl italic mb-12">Checkout</h1>

        <form onSubmit={submit} className="grid lg:grid-cols-[1fr_360px] gap-12">
          <div className="space-y-10">
            <section>
              <h2 className="eyebrow text-bronze/70 mb-5">Shipping address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name" value={form.full_name} onChange={(v) => update("full_name", v)} required />
                <Field label="Phone" value={form.phone} onChange={(v) => update("phone", v)} required />
                <Field className="sm:col-span-2" label="Address line 1" value={form.line1} onChange={(v) => update("line1", v)} required />
                <Field className="sm:col-span-2" label="Address line 2" value={form.line2} onChange={(v) => update("line2", v)} />
                <Field label="City" value={form.city} onChange={(v) => update("city", v)} required />
                <Field label="State / Region" value={form.state} onChange={(v) => update("state", v)} />
                <Field label="Postal code" value={form.postal_code} onChange={(v) => update("postal_code", v)} required />
                <Field label="Country" value={form.country} onChange={(v) => update("country", v)} required />
              </div>
            </section>

            <section>
              <h2 className="eyebrow text-bronze/70 mb-5">Payment method</h2>
              <div className="space-y-3">
                {(
                  [
                    { v: "razorpay", l: "Razorpay — UPI (GPay, PhonePe, Paytm), Cards, Net Banking" },
                    { v: "cod", l: "Cash on delivery" },
                  ] as const
                ).map((o) => (
                  <label
                    key={o.v}
                    className={`flex items-center gap-3 p-4 border cursor-pointer transition-colors ${
                      method === o.v ? "border-bronze bg-tea/30" : "border-bronze/20 hover:bg-tea/10"
                    }`}
                  >
                    <input
                      type="radio"
                      name="method"
                      value={o.v}
                      checked={method === o.v}
                      onChange={() => setMethod(o.v)}
                      className="accent-bronze"
                    />
                    <span className="text-sm">{o.l}</span>
                  </label>
                ))}
              </div>
              {method === "razorpay" && (
                <p className="text-xs opacity-60 mt-3">
                  Secured by Razorpay. You'll complete payment in a secure popup.
                </p>
              )}
            </section>
          </div>

          <aside className="bg-tea/20 p-8 h-fit space-y-5">
            <h2 className="font-serif text-2xl">Order summary</h2>
            <ul className="space-y-3 text-sm">
              {items.map((i) => (
                <li key={i.productId} className="flex justify-between gap-4">
                  <span className="flex-1">
                    {i.name} <span className="opacity-60">× {i.quantity}</span>
                  </span>
                  <span>{formatPrice(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-bronze/20 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
              </div>
            </div>
            <div className="flex justify-between font-serif text-lg border-t border-bronze/20 pt-4">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-bronze text-cornsilk px-8 py-4 text-xs uppercase tracking-[0.2em] hover:bg-bronze-dark transition-colors disabled:opacity-50"
            >
              {submitting ? "Placing order…" : "Place order"}
            </button>
          </aside>
        </form>
      </div>
      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block eyebrow text-bronze/70 mb-2">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-transparent border border-bronze/30 px-4 py-3 text-sm focus:outline-none focus:border-bronze"
      />
    </label>
  );
}
