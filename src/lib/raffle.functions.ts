import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createOrderSchema,
  orderIdSchema,
  sanitizeWhatsapp,
} from "./raffle-schemas";
import {
  createPixPayment,
  getPaymentStatus,
  sanitizeCpf,
} from "./pix.server";
import type { Database } from "@/integrations/supabase/types";

const createOrderInputSchema = z.object({
  numbers: z.array(z.number().int().min(0).max(100)),
  buyer: z.object({
    name: z.string(),
    whatsapp: z.string(),
    email: z.string().email(),
    cpf: z.string(),
  }),
});

export const createPixOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => createOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("Access Token do Mercado Pago não configurado.");
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const amount = data.numbers.length * 25;
    const orderId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: reserved, error: reserveError } = await supabaseAdmin.rpc(
      "reserve_numbers",
      {
        _numbers: data.numbers,
        _order_id: orderId,
        _expires_at: expiresAt,
      },
    );

    if (reserveError || !reserved) {
      throw new Error(
        "Um ou mais números já foram reservados. Atualize a página e tente novamente.",
      );
    }

    const firstName = data.buyer.name.split(" ")[0];
    const lastName = data.buyer.name.split(" ").slice(1).join(" ");

    const description = `Rifa Air Fryer + R$500 - Números: ${data.numbers.map((n) => n.toString().padStart(2, "0")).join(", ")}`;

    const pix = await createPixPayment(
      {
        amount,
        description,
        payer: {
          email: data.buyer.email,
          firstName,
          lastName,
          cpf: sanitizeCpf(data.buyer.cpf),
        },
        idempotencyKey: orderId,
      },
      accessToken,
    );

    const { error: insertError } = await supabaseAdmin.from("orders").insert({
      id: orderId,
      numbers: data.numbers,
      amount,
      buyer_name: data.buyer.name,
      buyer_whatsapp: sanitizeWhatsapp(data.buyer.whatsapp),
      buyer_email: data.buyer.email,
      buyer_cpf: sanitizeCpf(data.buyer.cpf),
      mp_payment_id: pix.id,
      pix_qr_code_base64: pix.qrCodeBase64,
      pix_copia_cola: pix.qrCode,
      status: "pending",
      expires_at: pix.expirationDate || expiresAt,
    });

    if (insertError) {
      console.error("Insert order error:", insertError);
      await supabaseAdmin.rpc("release_numbers", { _order_id: orderId });
      throw new Error("Erro ao salvar o pedido. Tente novamente.");
    }

    return {
      orderId,
      qrBase64: pix.qrCodeBase64,
      qrCopiaCola: pix.qrCode,
      expiresAt: pix.expirationDate || expiresAt,
    };
  });

export const getOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((input) => orderIdSchema.parse(input))
  .handler(async ({ data }) => {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("Access Token do Mercado Pago não configurado.");
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("status, mp_payment_id, expires_at")
      .eq("id", data.orderId)
      .single();

    if (error || !order) {
      throw new Error("Pedido não encontrado.");
    }

    if (order.status === "paid") {
      return { status: "paid", orderId: data.orderId };
    }

    if (order.status === "expired" || order.status === "cancelled") {
      return { status: order.status, orderId: data.orderId };
    }

    if (new Date(order.expires_at) < new Date()) {
      await supabaseAdmin.rpc("release_numbers", { _order_id: data.orderId });
      return { status: "expired", orderId: data.orderId };
    }

    if (!order.mp_payment_id) {
      return { status: "pending", orderId: data.orderId };
    }

    const payment = await getPaymentStatus(order.mp_payment_id, accessToken);

    if (payment.status === "approved") {
      await supabaseAdmin.rpc("confirm_numbers", { _order_id: data.orderId });
      return { status: "paid", orderId: data.orderId };
    }

    if (
      ["cancelled", "rejected", "refunded", "charged_back"].includes(
        payment.status,
      )
    ) {
      await supabaseAdmin.rpc("release_numbers", { _order_id: data.orderId });
      return { status: "cancelled", orderId: data.orderId };
    }

    return { status: "pending", orderId: data.orderId };
  });

export const listRaffleNumbers = createServerFn({ method: "GET" }).handler(
  async () => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabasePublic = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { data, error } = await supabasePublic
      .from("raffle_numbers")
      .select("number, status, order_id")
      .order("number", { ascending: true });

    if (error) {
      console.error("List numbers error:", error);
      throw new Error("Erro ao carregar números da rifa.");
    }

    return data;
  },
);
