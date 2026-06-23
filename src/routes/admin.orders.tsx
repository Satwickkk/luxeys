import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

const STATUSES = ["placed", "confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "returned", "refunded"] as const;
type Status = (typeof STATUSES)[number];

function AdminOrders() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin", "orders", filter],
    queryFn: async () => {
      let q = supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const { data: items } = useQuery({
    queryKey: ["admin", "order-items", expanded],
    enabled: !!expanded,
    queryFn: async () => {
      const { data } = await supabase.from("order_items").select("*").eq("order_id", expanded!);
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow text-bronze/70">Fulfillment</p>
        <h1 className="font-serif text-4xl mt-2">Orders</h1>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-xs uppercase tracking-wider border ${
              filter === s ? "bg-bronze text-cornsilk border-bronze" : "border-bronze/30 hover:bg-tea-green/30"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-secondary-cream border border-bronze/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-tea-green/40 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Order</th>
              <th className="text-left px-4 py-3">Customer</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Payment</th>
              <th className="text-right px-4 py-3">Total</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="px-4 py-8 text-center opacity-60">Loading…</td></tr>}
            {!isLoading && (orders ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center opacity-60">No orders.</td></tr>
            )}
            {(orders ?? []).map((o) => (
              <Fragment key={o.id}>
                <tr
                  className="border-t border-bronze/10 cursor-pointer hover:bg-tea-green/20"
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                >
                  <td className="px-4 py-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{o.shipping_name}</td>
                  <td className="px-4 py-3 text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wider">{o.payment_method}</td>
                  <td className="px-4 py-3 text-right">{formatPrice(Number(o.total))}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={o.status}
                      onChange={(e) => updateStatus.mutate({ id: o.id, status: e.target.value as Status })}
                      className="bg-transparent border border-bronze/30 px-2 py-1 text-xs uppercase tracking-wider"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
                {expanded === o.id && (
                  <tr className="bg-cornsilk/60">
                    <td colSpan={6} className="px-6 py-5">
                      <div className="grid md:grid-cols-2 gap-6 text-sm">
                        <div>
                          <p className="eyebrow text-bronze/70 mb-2">Shipping</p>
                          <p>{o.shipping_name}</p>
                          <p>{o.shipping_phone}</p>
                          <p>{o.shipping_line1}{o.shipping_line2 ? `, ${o.shipping_line2}` : ""}</p>
                          <p>{o.shipping_city}{o.shipping_state ? `, ${o.shipping_state}` : ""} {o.shipping_postal_code}</p>
                          <p>{o.shipping_country}</p>
                        </div>
                        <div>
                          <p className="eyebrow text-bronze/70 mb-2">Items</p>
                          <ul className="space-y-1">
                            {(items ?? []).map((it) => (
                              <li key={it.id} className="flex justify-between">
                                <span>{it.product_name} × {it.quantity}</span>
                                <span>{formatPrice(Number(it.unit_price) * it.quantity)}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="border-t border-bronze/20 mt-3 pt-2 flex justify-between">
                            <span>Subtotal</span><span>{formatPrice(Number(o.subtotal))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Shipping</span><span>{formatPrice(Number(o.shipping))}</span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>Total</span><span>{formatPrice(Number(o.total))}</span>
                          </div>
                          {o.payment_reference && (
                            <p className="text-xs opacity-60 mt-2">Ref: {o.payment_reference}</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
