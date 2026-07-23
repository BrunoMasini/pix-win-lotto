import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import {
  Search,
  Ticket,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBuyerOrders } from "@/lib/raffle.functions";
import { PixPaymentDialog } from "@/components/raffle/PixPaymentDialog";
import { formatCpf } from "@/lib/raffle-schemas";

export const Route = createFileRoute("/meus-numeros")({
  head: () => ({
    meta: [
      { title: "Meus números — Rifa Online" },
      {
        name: "description",
        content:
          "Consulte os números que você reservou ou já pagou na rifa online.",
      },
      { property: "og:title", content: "Meus números — Rifa Online" },
      {
        property: "og:description",
        content:
          "Veja seus pedidos, números pagos e reservas pendentes na rifa online.",
      },
    ],
  }),
  component: MeusNumerosPage,
});

type BuyerOrder = Awaited<ReturnType<typeof getBuyerOrders>>[number];

function MeusNumerosPage() {
  const [mode, setMode] = useState<"email" | "cpf">("email");
  const [value, setValue] = useState("");
  const [orders, setOrders] = useState<BuyerOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activePix, setActivePix] = useState<BuyerOrder | null>(null);

  const fetchOrders = useServerFn(getBuyerOrders);

  const mutation = useMutation({
    mutationFn: async () => {
      const trimmed = value.trim();
      if (mode === "email") {
        return fetchOrders({ data: { email: trimmed } });
      }
      return fetchOrders({ data: { cpf: trimmed } });
    },
    onSuccess: (data) => {
      setOrders(data);
      setError(null);
    },
    onError: (err: unknown) => {
      setOrders(null);
      setError(err instanceof Error ? err.message : "Erro ao consultar.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      setError(mode === "email" ? "Informe seu e-mail." : "Informe seu CPF.");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-raffle-cream to-background">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para a rifa
        </Link>

        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Ticket className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Meus números
              </h1>
              <p className="text-sm text-muted-foreground">
                Consulte os pedidos feitos com seu e-mail ou CPF.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2 rounded-lg bg-raffle-cream p-1 text-sm">
              <button
                type="button"
                onClick={() => {
                  setMode("email");
                  setValue("");
                  setError(null);
                }}
                className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
                  mode === "email"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Por e-mail
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("cpf");
                  setValue("");
                  setError(null);
                }}
                className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
                  mode === "cpf"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Por CPF
              </button>
            </div>

            <div className="flex gap-2">
              <Input
                type={mode === "email" ? "email" : "text"}
                inputMode={mode === "email" ? "email" : "numeric"}
                autoComplete={mode === "email" ? "email" : "off"}
                placeholder={
                  mode === "email" ? "seu@email.com" : "000.000.000-00"
                }
                value={value}
                onChange={(e) => {
                  const next =
                    mode === "cpf" ? formatCpf(e.target.value) : e.target.value;
                  setValue(next);
                }}
                maxLength={mode === "cpf" ? 14 : 255}
              />
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="raffle-gradient border-0 font-semibold"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </form>

          {orders && (
            <div className="mt-8">
              <h2 className="mb-3 font-semibold text-foreground">
                {orders.length === 0
                  ? "Nenhum pedido encontrado."
                  : `${orders.length} pedido${orders.length !== 1 ? "s" : ""} encontrado${orders.length !== 1 ? "s" : ""}`}
              </h2>

              <div className="space-y-3">
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onOpenPix={() => setActivePix(order)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {activePix && activePix.pixQrBase64 && activePix.pixCopiaCola && (
        <PixPaymentDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setActivePix(null);
          }}
          orderId={activePix.id}
          qrBase64={activePix.pixQrBase64}
          qrCopiaCola={activePix.pixCopiaCola}
          expiresAt={activePix.expiresAt}
          onExpired={() => setActivePix(null)}
          onPaid={() => {
            setActivePix(null);
            mutation.mutate();
          }}
        />
      )}
    </div>
  );
}

function OrderCard({
  order,
  onOpenPix,
}: {
  order: BuyerOrder;
  onOpenPix: () => void;
}) {
  const statusMeta = getStatusMeta(order.status, order.expiresAt);
  const numbers = order.numbers
    .map((n) => n.toString().padStart(2, "0"))
    .join(" · ");
  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(order.amount);
  const date = new Date(order.createdAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const canReopenPix =
    order.status === "pending" &&
    !!order.pixQrBase64 &&
    !!order.pixCopiaCola &&
    new Date(order.expiresAt) > new Date();

  return (
    <div className="rounded-xl border border-border bg-raffle-cream/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-xs text-muted-foreground">{date}</div>
          {order.raffleTitle && (
            <div className="text-sm font-medium text-foreground">
              {order.raffleTitle}
            </div>
          )}
        </div>
        <div
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
        >
          {statusMeta.icon}
          {statusMeta.label}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Números
        </div>
        <div className="mt-1 font-mono text-lg font-bold text-foreground">
          {numbers}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{currency}</span>
        </div>
        {canReopenPix && (
          <Button size="sm" variant="outline" onClick={onOpenPix}>
            Ver PIX
          </Button>
        )}
      </div>
    </div>
  );
}

function getStatusMeta(status: string, expiresAt: string) {
  if (status === "paid") {
    return {
      label: "Pago",
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: "bg-raffle-green/20 text-raffle-green-dark",
    };
  }
  if (status === "pending") {
    const expired = new Date(expiresAt) < new Date();
    if (expired) {
      return {
        label: "PIX expirando...",
        icon: <Clock className="h-3 w-3" />,
        className: "bg-amber-100 text-amber-700",
      };
    }
    return {
      label: "Aguardando pagamento",
      icon: <Clock className="h-3 w-3" />,
      className: "bg-amber-100 text-amber-700",
    };
  }
  if (status === "expired") {
    return {
      label: "Expirado",
      icon: <XCircle className="h-3 w-3" />,
      className: "bg-muted text-muted-foreground",
    };
  }
  return {
    label: status,
    icon: <XCircle className="h-3 w-3" />,
    className: "bg-muted text-muted-foreground",
  };
}
