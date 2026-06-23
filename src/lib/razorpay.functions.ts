import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { amount: number; currency?: string; receipt?: string }) => d)
  .handler(async ({ data }) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay keys not configured");

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({
        amount: Math.round(data.amount * 100),
        currency: data.currency ?? "INR",
        receipt: data.receipt ?? `rcpt_${Date.now()}`,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Razorpay order failed: ${t}`);
    }
    const order = (await res.json()) as { id: string; amount: number; currency: string };
    return { orderId: order.id, keyId, amount: order.amount, currency: order.currency };
  });

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string; paymentId: string; signature: string }) => d)
  .handler(async ({ data }) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay keys not configured");

    // 1. HMAC signature verification
    const expected = createHmac("sha256", keySecret)
      .update(`${data.orderId}|${data.paymentId}`)
      .digest("hex");
    if (expected !== data.signature) throw new Error("Invalid payment signature");

    // 2. Confirm with Razorpay that the payment is actually captured/authorized
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch(`https://api.razorpay.com/v1/payments/${data.paymentId}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!res.ok) throw new Error(`Razorpay lookup failed: ${await res.text()}`);
    const payment = (await res.json()) as {
      status: string;
      order_id: string;
      amount: number;
      currency: string;
      method: string;
    };
    if (payment.order_id !== data.orderId) throw new Error("Order/payment mismatch");
    if (payment.status !== "captured" && payment.status !== "authorized") {
      throw new Error(`Payment not captured (status: ${payment.status})`);
    }

    return {
      valid: true,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
    };
  });
