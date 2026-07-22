import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createOrderSchema,
  orderIdSchema,
  sanitizeWhatsapp,
  isValidCpf,
} from "./raffle-schemas";

import {
  createPixPayment,
  getPaymentStatus,
  sanitizeCpf,
} from "./pix.server";
import { createServerSupabasePublicClient } from "./supabase-public.server";

async function getActiveRaffle() {
  const supabasePublic = createServerSupabasePublicClient();
  const { data, error } = await supabasePublic
    .from("raffles")
    .select("id, title, description, image_url, price_per_number, total_numbers, status")
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error("Erro ao carregar rifa ativa.");
  if (!data) throw new Error("Nenhuma rifa ativa no momento.");
  return data;
}

export const createPixOrder = createServerFn({ method: "POST" })
  .validator((input) => createOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("Access Token do Mercado Pago não configurado.");
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const raffle = await getActiveRaffle();
    const amount = data.numbers.length * Number(raffle.price_per_number);
    const orderId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: reserved, error: reserveError } = await supabaseAdmin.rpc(
      "reserve_numbers",
      {
        _raffle_id: raffle.id,
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

    const description = `${raffle.title} - Números: ${data.numbers.map((n) => n.toString().padStart(2, "0")).join(", ")}`;

    let notificationUrl: string | undefined;
    const publicUrl = process.env.PUBLIC_APP_URL;
    if (publicUrl) {
      notificationUrl = `${publicUrl.replace(/\/$/, "")}/api/public/mp-webhook`;
    }

    let pix;
    try {
      pix = await createPixPayment(
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
          notificationUrl,
          expirationDate: expiresAt,
        },
        accessToken,
      );
    } catch (err) {
      await supabaseAdmin.rpc("release_numbers", { _order_id: orderId });
      throw err;
    }

    const { error: insertError } = await supabaseAdmin.from("orders").insert({
      id: orderId,
      raffle_id: raffle.id,
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
  .validator((input) => orderIdSchema.parse(input))
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

    if (order.status === "cancelled") {
      return { status: order.status, orderId: data.orderId };
    }

    // SEMPRE consultar a MP antes de expirar, para não descartar pagamentos
    // aprovados perto do prazo. Só expiramos quando o MP também confirma.
    if (order.mp_payment_id) {
      try {
        const payment = await getPaymentStatus(order.mp_payment_id, accessToken);

        if (payment.status === "approved") {
          // Usa a versão "force" para reaproveitar pedidos que já viraram expired.
          await supabaseAdmin.rpc("confirm_numbers_force", {
            _order_id: data.orderId,
          });
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
      } catch (err) {
        console.error("getOrderStatus MP check failed:", err);
      }
    }

    if (order.status === "expired") {
      return { status: "expired", orderId: data.orderId };
    }

    if (new Date(order.expires_at) < new Date()) {
      // MP não aprovou até o vencimento — libera os números.
      await supabaseAdmin.rpc("release_numbers", { _order_id: data.orderId });
      return { status: "expired", orderId: data.orderId };
    }

    return { status: "pending", orderId: data.orderId };
  });


export const listRaffleNumbers = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabasePublic = createServerSupabasePublicClient();

    // Fire-and-forget: libera pedidos expirados antes de listar.
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      await supabaseAdmin.rpc("expire_stale_orders");
    } catch (e) {
      console.error("expire_stale_orders failed:", e);
    }

    const { data: raffle } = await supabasePublic
      .from("raffles")
      .select("id")
      .eq("status", "active")
      .maybeSingle();

    if (!raffle) return [];

    const { data, error } = await supabasePublic
      .from("raffle_numbers")
      .select("number, status, order_id")
      .eq("raffle_id", raffle.id)
      .order("number", { ascending: true });

    if (error) {
      console.error("List numbers error:", error);
      throw new Error("Erro ao carregar números da rifa.");
    }

    return data;
  },
);

export const getActiveRaffleInfo = createServerFn({ method: "GET" }).handler(
  async () => {
    const raffle = await getActiveRaffle();
    return raffle;
  },
);

export const listFinishedRaffles = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabasePublic = createServerSupabasePublicClient();
    const { data, error } = await supabasePublic
      .from("raffles")
      .select("id, title, image_url, winner_number, winner_name, finished_at")
      .eq("status", "finished")
      .order("finished_at", { ascending: false });
    if (error) throw new Error("Erro ao carregar histórico.");
    return data ?? [];
  },
);
