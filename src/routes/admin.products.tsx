import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  image_url: string | null;
  featured: boolean;
  active: boolean;
  category_id: string | null;
};

const empty: Omit<ProductRow, "id"> = {
  slug: "",
  name: "",
  description: "",
  price: 0,
  stock: 0,
  image_url: "",
  featured: false,
  active: true,
  category_id: null,
};

function AdminProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: products } = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductRow[];
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      return data ?? [];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<ProductRow> & { id?: string }) => {
      if (row.id) {
        const { id, ...rest } = row;
        const { error } = await supabase.from("products").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(row as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      setEditing(null);
      setCreating(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editingRow = creating ? { ...empty, id: "" } : editing;

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="eyebrow text-bronze/70">Catalog</p>
          <h1 className="font-serif text-4xl mt-2">Products</h1>
        </div>
        <button
          onClick={() => { setCreating(true); setEditing(null); }}
          className="bg-bronze text-cornsilk px-6 py-3 text-xs uppercase tracking-[0.18em] hover:bg-bronze-dark"
        >
          + New product
        </button>
      </div>

      <div className="bg-secondary-cream border border-bronze/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-tea-green/40 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Slug</th>
              <th className="text-right px-4 py-3">Price</th>
              <th className="text-right px-4 py-3">Stock</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p) => (
              <tr key={p.id} className="border-t border-bronze/10">
                <td className="px-4 py-3">{p.name}{p.featured && <span className="ml-2 text-xs text-bronze">★</span>}</td>
                <td className="px-4 py-3 font-mono text-xs opacity-70">{p.slug}</td>
                <td className="px-4 py-3 text-right">{formatPrice(Number(p.price))}</td>
                <td className="px-4 py-3 text-right">{p.stock}</td>
                <td className="px-4 py-3 text-xs uppercase tracking-wider">{p.active ? "Active" : "Hidden"}</td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => { setEditing(p); setCreating(false); }} className="text-bronze hover:underline text-xs uppercase tracking-wider">Edit</button>
                  <button
                    onClick={() => { if (confirm(`Delete ${p.name}?`)) del.mutate(p.id); }}
                    className="text-destructive hover:underline text-xs uppercase tracking-wider"
                  >Delete</button>
                </td>
              </tr>
            ))}
            {(products?.length ?? 0) === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center opacity-60">No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editingRow && (
        <ProductEditor
          initial={editingRow}
          categories={categories ?? []}
          onCancel={() => { setEditing(null); setCreating(false); }}
          onSave={(row) => upsert.mutate(row)}
          saving={upsert.isPending}
        />
      )}
    </div>
  );
}

function ProductEditor({
  initial,
  categories,
  onCancel,
  onSave,
  saving,
}: {
  initial: ProductRow & { id?: string };
  categories: { id: string; name: string }[];
  onCancel: () => void;
  onSave: (row: Partial<ProductRow> & { id?: string }) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState(initial);
  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm({ ...form, [k]: v });
  }
  return (
    <div className="fixed inset-0 bg-bronze/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-cornsilk w-full max-w-2xl rounded-lg p-8 max-h-[90vh] overflow-auto">
        <h2 className="font-serif text-2xl mb-6">{initial.id ? "Edit product" : "New product"}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const payload: Partial<ProductRow> & { id?: string } = {
              ...form,
              price: Number(form.price),
              stock: Number(form.stock),
            };
            if (initial.id) payload.id = initial.id;
            onSave(payload);
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" value={form.name} onChange={(v) => set("name", v)} required />
            <Field label="Slug" value={form.slug} onChange={(v) => set("slug", v)} required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Price" type="number" value={String(form.price)} onChange={(v) => set("price", Number(v))} required />
            <Field label="Stock" type="number" value={String(form.stock)} onChange={(v) => set("stock", Number(v))} required />
            <label className="block">
              <span className="block eyebrow text-bronze/70 mb-2">Category</span>
              <select
                value={form.category_id ?? ""}
                onChange={(e) => set("category_id", e.target.value || null)}
                className="w-full bg-transparent border border-bronze/30 px-3 py-2.5 text-sm"
              >
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <Field label="Image URL or asset name" value={form.image_url ?? ""} onChange={(v) => set("image_url", v)} />
          <label className="block">
            <span className="block eyebrow text-bronze/70 mb-2">Description</span>
            <textarea
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              className="w-full bg-transparent border border-bronze/30 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
              Featured
            </label>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button type="button" onClick={onCancel} className="px-6 py-3 text-xs uppercase tracking-widest border border-bronze/30">Cancel</button>
            <button type="submit" disabled={saving} className="bg-bronze text-cornsilk px-6 py-3 text-xs uppercase tracking-widest hover:bg-bronze-dark disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="block eyebrow text-bronze/70 mb-2">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        step={type === "number" ? "0.01" : undefined}
        className="w-full bg-transparent border border-bronze/30 px-3 py-2.5 text-sm focus:outline-none focus:border-bronze"
      />
    </label>
  );
}
