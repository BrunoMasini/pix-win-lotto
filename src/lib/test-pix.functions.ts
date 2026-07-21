import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const approveSchema = z.object({ paymentId: z.string() });

export const approveTestPayment = createServerFn({ method: "POST" })
  .validator((input) => approveSchema.parse(input))
  .handler(async ({ data }) => {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
    }

    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${data.paymentId}/test`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const body = await response.json();

    if (!response.ok) {
      console.error("Mercado Pago test approval error:", response.status, body);
      throw new Error(
        `Falha ao aprovar pagamento de teste: ${body.message || body.error || response.statusText}`,
      );
    }

    return { success: true, status: body.status, paymentId: data.paymentId };
  });
