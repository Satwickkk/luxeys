import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/lib/auth";

const search = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Sign in — LYS" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading, isAdmin, rolesLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user || rolesLoading) return;
    if (isAdmin) {
      navigate({ to: "/admin" });
    } else {
      navigate({ to: redirect ?? "/account" });
    }
  }, [user, loading, rolesLoading, isAdmin, redirect, navigate]);


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Welcome to LYS", { description: "Check your inbox to confirm your email." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-cornsilk">
      <SiteHeader />
      <div className="max-w-md mx-auto px-6 py-20">
        <h1 className="font-serif italic text-4xl mb-2">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="opacity-70 mb-10 text-sm">
          {mode === "signin"
            ? "Sign in to access your bag and order history."
            : "Join LYS for early access and editorial stories."}
        </p>

        <form onSubmit={submit} className="space-y-5">
          {mode === "signup" && (
            <Input label="Full name" value={name} onChange={setName} required />
          )}
          <Input label="Email" type="email" value={email} onChange={setEmail} required />
          <Input label="Password" type="password" value={password} onChange={setPassword} required minLength={6} />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-bronze text-cornsilk px-8 py-4 text-xs uppercase tracking-[0.2em] hover:bg-bronze-dark transition-colors disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-center mt-8 opacity-70">
          {mode === "signin" ? "New to LYS?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-bronze underline-offset-4 hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>

        {mode === "signin" && (
          <p className="text-sm text-center mt-3 opacity-70">
            <Link to="/forgot-password" className="text-bronze underline-offset-4 hover:underline">
              Forgot your password?
            </Link>
          </p>
        )}

        <p className="text-xs text-center mt-12 opacity-50">
          <Link to="/">← Back to LYS</Link>
        </p>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block">
      <span className="block eyebrow text-bronze/70 mb-2">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        className="w-full bg-transparent border border-bronze/30 px-4 py-3 text-sm focus:outline-none focus:border-bronze"
      />
    </label>
  );
}
