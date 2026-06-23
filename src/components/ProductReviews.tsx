import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="inline-flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange?.(n)}
          disabled={!onChange}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={`text-lg leading-none ${n <= value ? "text-bronze" : "text-bronze/25"} ${
            onChange ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, user_id, rating, comment, created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase
        .from("reviews")
        .upsert(
          { product_id: productId, user_id: user.id, rating, comment: comment.trim() || null },
          { onConflict: "product_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review posted");
      setComment("");
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const avg = reviews && reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  const mine = reviews?.find((r) => r.user_id === user?.id);

  return (
    <section className="max-w-3xl mx-auto px-6 md:px-10 py-16 border-t border-bronze/10">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="eyebrow text-bronze/70">Reviews</p>
          <h2 className="font-serif text-3xl mt-2">What customers say</h2>
        </div>
        {reviews && reviews.length > 0 && (
          <div className="text-right">
            <Stars value={Math.round(avg)} />
            <p className="text-xs opacity-60 mt-1">
              {avg.toFixed(1)} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {user ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit.mutate();
          }}
          className="bg-tea/15 p-6 mb-10 space-y-4"
        >
          <div className="flex items-center gap-4">
            <span className="eyebrow text-bronze/70">Your rating</span>
            <Stars value={rating} onChange={setRating} />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your impressions…"
            rows={3}
            maxLength={1000}
            className="w-full bg-cornsilk border border-bronze/30 px-4 py-3 text-sm focus:outline-none focus:border-bronze resize-none"
          />
          <button
            type="submit"
            disabled={submit.isPending}
            className="bg-bronze text-cornsilk px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-bronze-dark transition-colors disabled:opacity-50"
          >
            {submit.isPending ? "Posting…" : mine ? "Update review" : "Post review"}
          </button>
        </form>
      ) : (
        <p className="text-sm mb-10 opacity-70">
          <Link to="/auth" className="underline underline-offset-4 text-bronze">Sign in</Link> to leave a review.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm opacity-60">Loading reviews…</p>
      ) : (reviews?.length ?? 0) === 0 ? (
        <p className="text-sm opacity-60">No reviews yet — be the first.</p>
      ) : (
        <ul className="space-y-6">
          {reviews!.map((r) => (
            <li key={r.id} className="border-b border-bronze/10 pb-6">
              <div className="flex items-center justify-between mb-2">
                <Stars value={r.rating} />
                <span className="text-xs opacity-50">
                  {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.comment && <p className="text-sm opacity-85 leading-relaxed">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
