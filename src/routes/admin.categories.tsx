import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/categories")({
  component: AdminCategories,
});

type Category = { id: string; name: string; slug: string; description: string | null; sort_order: number };

function AdminCategories() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", slug: "", description: "" });

  const { data: categories } = useQuery({
    queryKey: ["admin", "categories", "all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data as Category[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("categories").insert({
        name: form.name,
        slug: form.slug,
        description: form.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category created");
      setForm({ name: "", slug: "", description: "" });
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-10">
      <div>
        <p className="eyebrow text-bronze/70">Taxonomy</p>
        <h1 className="font-serif text-4xl mt-2">Categories</h1>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
        className="bg-secondary-cream border border-bronze/10 rounded-lg p-6 grid md:grid-cols-4 gap-4"
      >
        <input
          required value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Name"
          className="bg-transparent border border-bronze/30 px-3 py-2 text-sm"
        />
        <input
          required value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder="slug"
          className="bg-transparent border border-bronze/30 px-3 py-2 text-sm font-mono"
        />
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description (optional)"
          className="bg-transparent border border-bronze/30 px-3 py-2 text-sm"
        />
        <button className="bg-bronze text-cornsilk px-6 py-2 text-xs uppercase tracking-widest hover:bg-bronze-dark">
          Add category
        </button>
      </form>

      <div className="bg-secondary-cream border border-bronze/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-tea-green/40 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Slug</th>
              <th className="text-left px-4 py-3">Description</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(categories ?? []).map((c) => (
              <tr key={c.id} className="border-t border-bronze/10">
                <td className="px-4 py-3">{c.name}</td>
                <td className="px-4 py-3 font-mono text-xs opacity-70">{c.slug}</td>
                <td className="px-4 py-3 opacity-80">{c.description}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => { if (confirm(`Delete ${c.name}?`)) del.mutate(c.id); }}
                    className="text-destructive hover:underline text-xs uppercase tracking-wider"
                  >Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
