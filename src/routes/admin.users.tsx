import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

const ROLES: AppRole[] = ["customer", "admin", "super_admin"];

function AdminUsers() {
  const { isSuperAdmin, loading, user } = useAuth();
  const qc = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["admin", "users"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const [profiles, roles] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone, created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      const roleMap = new Map<string, AppRole>();
      (roles.data ?? []).forEach((r) => roleMap.set(r.user_id, r.role as AppRole));
      return (profiles.data ?? []).map((p) => ({
        ...p,
        role: roleMap.get(p.id) ?? ("customer" as AppRole),
      }));
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading) return <p className="opacity-60">Loading…</p>;
  if (!isSuperAdmin) return <Navigate to="/admin" />;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow text-bronze/70">Access control</p>
        <h1 className="font-serif text-4xl mt-2">Users & Roles</h1>
        <p className="text-sm opacity-70 mt-2">
          Each account has exactly one role — customer, admin, or super admin. Changing the role replaces the previous one.
        </p>
      </div>

      <div className="bg-secondary-cream border border-bronze/10 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-tea-green/40 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Current role</th>
              <th className="text-left px-4 py-3">Change role</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => {
              const isSelf = u.id === user?.id;
              return (
                <tr key={u.id} className="border-t border-bronze/10 align-top">
                  <td className="px-4 py-3">
                    {u.full_name || <span className="opacity-50">(no name)</span>}
                    {isSelf && <span className="ml-2 text-xs opacity-50">(you)</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs opacity-60">{u.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <span className="bg-bronze/10 border border-bronze/30 px-2 py-0.5 text-xs uppercase tracking-wider">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={isSelf}
                      onChange={(e) => {
                        const role = e.target.value as AppRole;
                        if (role === u.role) return;
                        if (confirm(`Change role to ${role}? This replaces the current role.`)) {
                          setRole.mutate({ userId: u.id, role });
                        }
                      }}
                      className="bg-transparent border border-bronze/30 px-2 py-1 text-xs uppercase tracking-wider disabled:opacity-40"
                      title={isSelf ? "You can't change your own role" : undefined}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
