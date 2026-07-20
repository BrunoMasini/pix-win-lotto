import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { verifyWebhookSignature, getPaymentStatus } from "@/lib/pix.server";

const webhookPayloadSchema = z.object({
  data: z.object({
    id: z.string(),
  }),
  type: z.string().optional(),
});

export const Route = createFileRoute("/api/public/mp-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        const signature = request.headers.get("x-signature") || "";
        const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
        const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

        if (!accessToken) {
          return new Response("Access token not configured", { status: 500 });
        }

        if (secret && !verifyWebhookSignature(body, signature, secret)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: unknown;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsed = webhookPayloadSchema.safeParse(payload);
        if (!parsed.success) {
          return new Response("Invalid payload", { status: 400 });
        }

        const paymentId = parsed.data.data.id;

        try {
          const payment = await getPaymentStatus(paymentId, accessToken);

          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          const { data: orders, error: findError } = await supabaseAdmin
            .from("orders")
            .select("id, status")
            .eq("mp_payment_id", paymentId)
            .eq("status", "pending");

          if (findError || !orders || orders.length === 0) {
            return new Response("ok", { status: 200 });
          }

          for (const order of orders) {
            if (payment.status === "approved") {
              await supabaseAdmin.rpc("confirm_numbers", {
                _order_id: order.id,
              });
            } else if (
              ["cancelled", "rejected", "refunded", "charged_back"].includes(
                payment.status,
              )
            ) {
              await supabaseAdmin.rpc("release_numbers", {
                _order_id: order.id,
              });
            }
          }

          return new Response("ok", { status: 200 });
        } catch (error) {
          console.error("Webhook processing error:", error);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});
