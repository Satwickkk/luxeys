import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook not configured", { status: 500 });

        const signature = request.headers.get("x-razorpay-signature") ?? "";
        const body = await request.text();
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(body) as {
          event: string;
          payload: {
            payment?: { entity: { id: string; order_id: string; status: string } };
          };
        };

        const payment = payload.payload.payment?.entity;
        if (!payment) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let nextStatus: "confirmed" | "cancelled" | null = null;
        if (payload.event === "payment.captured") nextStatus = "confirmed";
        else if (payload.event === "payment.failed") nextStatus = "cancelled";

        if (nextStatus) {
          await supabaseAdmin
            .from("orders")
            .update({ status: nextStatus, payment_reference: payment.id })
            .eq("payment_reference", payment.id);

          // Fallback: match by razorpay order id stored as receipt if needed
          await supabaseAdmin
            .from("orders")
            .update({ status: nextStatus, payment_reference: payment.id })
            .eq("payment_reference", payment.order_id);
        }

        return new Response("ok");
      },
    },
  },
});
