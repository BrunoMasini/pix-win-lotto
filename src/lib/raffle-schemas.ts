import { z } from "zod";

export const cpfSchema = z
  .string()
  .min(11, "CPF inválido")
  .max(14, "CPF inválido")
  .refine((value) => isValidCpf(value), {
    message: "CPF inválido",
  });

export const buyerSchema = z.object({
  name: z.string().min(3, "Nome completo é obrigatório").max(120),
  whatsapp: z
    .string()
    .min(10, "WhatsApp inválido")
    .max(20, "WhatsApp inválido"),
  email: z.string().email("E-mail inválido").max(255),
  cpf: cpfSchema,
});

export const createOrderSchema = z.object({
  numbers: z
    .array(z.number().int().min(0).max(100))
    .min(1, "Selecione pelo menos um número")
    .max(20, "Máximo de 20 números por pedido"),
  buyer: buyerSchema,
});

export const orderIdSchema = z.object({
  orderId: z.string().uuid(),
});

export type Buyer = z.infer<typeof buyerSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export function sanitizeWhatsapp(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCpf(value: string): boolean {
  const cpf = value.replace(/\D/g, "");

  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  let remainder = 0;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10), 10)) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11), 10)) return false;

  return true;
}

export function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}
