import { createHmac, timingSafeEqual } from "crypto";

const MP_API_URL = "https://api.mercadopago.com/v1/payments";

export interface PayerInfo {
  email: string;
  firstName: string;
  lastName?: string;
  cpf: string;
}

export interface PixPaymentRequest {
  amount: number;
  description: string;
  payer: PayerInfo;
  idempotencyKey: string;
}

export interface PixPaymentResponse {
  id: string;
  qrCodeBase64: string;
  qrCode: string;
  status: string;
  expirationDate?: string;
}

export async function createPixPayment(
  request: PixPaymentRequest,
  accessToken: string,
): Promise<PixPaymentResponse> {
  const payload = {
    transaction_amount: request.amount,
    payment_method_id: "pix",
    description: request.description,
    payer: {
      email: request.payer.email,
      first_name: request.payer.firstName,
      last_name: request.payer.lastName || "",
      identification: {
        type: "CPF",
        number: request.payer.cpf,
      },
    },
  };

  const response = await fetch(MP_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Idempotency-Key": request.idempotencyKey,
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();

  if (!response.ok) {
    console.error("Mercado Pago create payment error:", response.status, body);
    throw new Error(
      `Falha ao gerar PIX: ${body.message || body.error || response.statusText}`,
    );
  }

  const pointOfInteraction = body.point_of_interaction;
  const transactionData = pointOfInteraction?.transaction_data;

  return {
    id: body.id.toString(),
    qrCodeBase64: transactionData?.qr_code_base64 || "",
    qrCode: transactionData?.qr_code || "",
    status: body.status,
    expirationDate: body.date_of_expiration,
  };
}

export async function getPaymentStatus(
  paymentId: string,
  accessToken: string,
): Promise<{ status: string; statusDetail?: string }> {
  const response = await fetch(`${MP_API_URL}/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const body = await response.json();

  if (!response.ok) {
    console.error("Mercado Pago get payment error:", response.status, body);
    throw new Error(
      `Falha ao consultar PIX: ${body.message || body.error || response.statusText}`,
    );
  }

  return {
    status: body.status,
    statusDetail: body.status_detail,
  };
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const sig = Buffer.from(signature);
  const exp = Buffer.from(expected);
  if (sig.length !== exp.length) return false;
  return timingSafeEqual(sig, exp);
}

export function sanitizeCpf(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
