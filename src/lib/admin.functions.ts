import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(context: {
  supabase: import("@supabase/supabase-js").SupabaseClient;
  userId: string;
}) {
  const { data, error } = await context.supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) throw new Error("Erro ao verificar permissão.");
  if (!data) throw new Error("Acesso negado. Você não é administrador.");
}

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { isAdmin: !!data, userId: context.userId };
  });

export const getSalesReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: activeRaffle } = await supabaseAdmin
      .from("raffles")
      .select("id, title, price_per_number, total_numbers")
      .eq("status", "active")
      .maybeSingle();

    if (!activeRaffle) {
      return {
        raffle: null,
        totalSold: 0,
        totalRevenue: 0,
        totalPending: 0,
        totalAvailable: 0,
        pendingRevenue: 0,
      };
    }

    const { data: nums } = await supabaseAdmin
      .from("raffle_numbers")
      .select("status")
      .eq("raffle_id", activeRaffle.id);

    const price = Number(activeRaffle.price_per_number);
    const sold = nums?.filter((n) => n.status === "paid").length ?? 0;
    const pending = nums?.filter((n) => n.status === "pending").length ?? 0;
    const available = nums?.filter((n) => n.status === "available").length ?? 0;

    return {
      raffle: activeRaffle,
      totalSold: sold,
      totalRevenue: sold * price,
      totalPending: pending,
      totalAvailable: available,
      pendingRevenue: pending * price,
    };
  });

export const listAllOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, raffle_id, numbers, amount, buyer_name, buyer_whatsapp, buyer_email, status, created_at, paid_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error("Erro ao carregar pedidos.");
    return data ?? [];
  });

const updateRaffleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(200),
  description: z.string().min(3).max(2000),
  image_url: z.string().url().or(z.literal("")).nullable(),
  price_per_number: z.number().positive(),
});

export const updateActiveRaffle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => updateRaffleSchema.parse(input))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("raffles")
      .update({
        title: data.title,
        description: data.description,
        image_url: data.image_url || null,
        price_per_number: data.price_per_number,
      })
      .eq("id", data.id)
      .eq("status", "active");
    if (error) throw new Error("Erro ao atualizar rifa.");
    return { ok: true };
  });

const finalizeSchema = z.object({
  raffleId: z.string().uuid(),
  winnerNumber: z.number().int().min(0).max(1000),
  newTitle: z.string().min(3).max(200),
  newDescription: z.string().min(3).max(2000),
  newImageUrl: z.string().url().or(z.literal("")).nullable(),
  newPrice: z.number().positive(),
  newTotalNumbers: z.number().int().min(2).max(1000),
});

export const finalizeAndCreateRaffle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => finalizeSchema.parse(input))
  .handler(async ({ context, data }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: newId, error } = await supabaseAdmin.rpc("finalize_raffle", {
      _raffle_id: data.raffleId,
      _winner_number: data.winnerNumber,
      _new_title: data.newTitle,
      _new_description: data.newDescription,
      _new_image_url: data.newImageUrl || "",
      _new_price: data.newPrice,
      _new_total_numbers: data.newTotalNumbers,
    });
    if (error) throw new Error("Erro ao finalizar rifa: " + error.message);
    return { newRaffleId: newId as unknown as string };
  });

export const listAllRafflesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("raffles")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Erro ao carregar rifas.");
    return data ?? [];
  });