import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — LYS" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent", { description: "Check your inbox." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-cornsilk">
      <SiteHeader />
      <div className="max-w-md mx-auto px-6 py-20">
        <h1 className="font-serif italic text-4xl mb-2">Reset your password</h1>
        <p className="opacity-70 mb-10 text-sm">
          We'll email you a secure link to set a new password.
        </p>

        {sent ? (
          <div className="bg-tea/30 p-6 text-sm">
            <p className="mb-3">If an account exists for <strong>{email}</strong>, a reset link is on its way.</p>
            <Link to="/auth" className="text-bronze underline underline-offset-4 text-xs uppercase tracking-widest">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="block eyebrow text-bronze/70 mb-2">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-transparent border border-bronze/30 px-4 py-3 text-sm focus:outline-none focus:border-bronze"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-bronze text-cornsilk px-8 py-4 text-xs uppercase tracking-[0.2em] hover:bg-bronze-dark transition-colors disabled:opacity-50"
            >
              {busy ? "Sending…" : "Send reset link"}
            </button>
            <p className="text-sm text-center mt-6 opacity-70">
              <Link to="/auth" className="text-bronze underline-offset-4 hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
