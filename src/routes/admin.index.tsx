import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const [products, orders, customers, recent] = await Promise.all([
        supabase.from("products").select("id, stock, active", { count: "exact", head: false }),
        supabase.from("orders").select("id, total, status, created_at"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("id, total, status, created_at, shipping_name")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      const productList = products.data ?? [];
      const orderList = orders.data ?? [];
      const revenue = orderList
        .filter((o) => o.status !== "cancelled")
        .reduce((s, o) => s + Number(o.total), 0);
      return {
        productCount: productList.length,
        outOfStock: productList.filter((p) => p.stock === 0).length,
        orderCount: orderList.length,
        revenue,
        customerCount: customers.count ?? 0,
        recent: recent.data ?? [],
      };
    },
  });

  if (isLoading) return <p className="opacity-60">Loading…</p>;
  if (!data) return null;

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow text-bronze/70">Dashboard</p>
        <h1 className="font-serif text-4xl mt-2">Overview</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Revenue" value={formatPrice(data.revenue)} />
        <Stat label="Orders" value={data.orderCount.toString()} />
        <Stat label="Products" value={data.productCount.toString()} hint={`${data.outOfStock} out of stock`} />
        <Stat label="Customers" value={data.customerCount.toString()} />
      </div>

      <section>
        <h2 className="font-serif text-2xl mb-4">Recent orders</h2>
        <div className="bg-secondary-cream border border-bronze/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-tea-green/40 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Order</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center opacity-60">No orders yet.</td></tr>
              )}
              {data.recent.map((o) => (
                <tr key={o.id} className="border-t border-bronze/10">
                  <td className="px-4 py-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">{o.shipping_name}</td>
                  <td className="px-4 py-3"><span className="text-xs uppercase tracking-wider">{o.status}</span></td>
                  <td className="px-4 py-3 text-right">{formatPrice(Number(o.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-secondary-cream border border-bronze/10 rounded-lg p-5">
      <p className="eyebrow text-bronze/70">{label}</p>
      <p className="font-serif text-3xl mt-2">{value}</p>
      {hint && <p className="text-xs opacity-60 mt-1">{hint}</p>}
    </div>
  );
}
