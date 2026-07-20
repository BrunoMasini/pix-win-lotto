import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  Gift,
  Clock,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Ticket,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NumberGrid, type NumberStatus } from "@/components/raffle/NumberGrid";
import { CheckoutDialog } from "@/components/raffle/CheckoutDialog";
import { PixPaymentDialog } from "@/components/raffle/PixPaymentDialog";
import { createPixOrder, listRaffleNumbers } from "@/lib/raffle.functions";
import type { Buyer } from "@/lib/raffle-schemas";

export const Route = createFileRoute("/")({
  component: RafflePage,
});

function RafflePage() {
  const [selected, setSelected] = useState<number[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pixOpen, setPixOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState<{
    orderId: string;
    qrBase64: string;
    qrCopiaCola: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const queryClient = useQueryClient();
  const fetchNumbers = useServerFn(listRaffleNumbers);
  const createOrder = useServerFn(createPixOrder);

  const {
    data: numbers = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["raffle-numbers"],
    queryFn: fetchNumbers,
    refetchInterval: 10000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("raffle_numbers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "raffle_numbers",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["raffle-numbers"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const mappedNumbers = useMemo(() => {
    const map = new Map<number, NumberStatus>();
    for (const n of numbers) {
      map.set(n.number, n.status as NumberStatus);
    }
    const all: Array<{ number: number; status: NumberStatus }> = [];
    for (let i = 0; i <= 100; i++) {
      all.push({ number: i, status: map.get(i) || "available" });
    }
    return all;
  }, [numbers]);

  const selectedCount = selected.length;
  const total = selectedCount * 25;

  const availableNumbers = useMemo(() => {
    const map = new Map(mappedNumbers.map((n) => [n.number, n.status]));
    return selected.filter((n) => map.get(n) === "available");
  }, [selected, mappedNumbers]);

  const handleToggle = (number: number) => {
    setSelected((prev) =>
      prev.includes(number)
        ? prev.filter((n) => n !== number)
        : [...prev, number].sort((a, b) => a - b),
    );
    setError(null);
  };

  const handleClear = () => {
    setSelected([]);
    setError(null);
  };

  const handleOpenCheckout = () => {
    if (selected.length === 0) {
      setError("Selecione pelo menos um número para continuar.");
      return;
    }
    setError(null);
    setCheckoutOpen(true);
  };

  const handleSubmitCheckout = async (buyer: Buyer) => {
    setIsGenerating(true);
    setError(null);
    try {
      const result = await createOrder({
        data: {
          numbers: availableNumbers,
          buyer,
        },
      });

      setSelected([]);
      setCheckoutOpen(false);
      setActiveOrder(result);
      setPixOpen(true);
      queryClient.invalidateQueries({ queryKey: ["raffle-numbers"] });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao gerar o PIX. Tente novamente.",
      );
      queryClient.invalidateQueries({ queryKey: ["raffle-numbers"] });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExpired = () => {
    setActiveOrder(null);
    setError("O PIX expirou. Selecione os números novamente caso ainda estejam disponíveis.");
    queryClient.invalidateQueries({ queryKey: ["raffle-numbers"] });
  };

  const handlePaid = () => {
    setActiveOrder(null);
    queryClient.invalidateQueries({ queryKey: ["raffle-numbers"] });
  };

  const paidCount = mappedNumbers.filter((n) => n.status === "paid").length;
  const pendingCount = mappedNumbers.filter((n) => n.status === "pending").length;
  const availableCount = 101 - paidCount - pendingCount;

  return (
    <div className="min-h-screen bg-gradient-to-b from-raffle-cream to-background">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="raffle-gradient px-6 py-10 text-center text-white sm:px-12 sm:py-14">
            <span className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur-sm">
              Sorteio exclusivo
            </span>
            <h1 className="font-display mt-2 text-3xl font-extrabold leading-tight sm:text-4xl md:text-5xl">
              Grande Sorteio: Air Fryer Elgin + R$ 500 no PIX!
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base opacity-95 sm:text-lg">
              Escolha seus números e concorra a uma fritadeira Air Fryer Elgin
              Facilita Fry 3,5L + R$ 500,00 no PIX. Cada cota custa apenas R$ 25,00.
            </p>
          </div>

          <div className="grid gap-8 p-6 sm:p-10 md:grid-cols-2 md:items-center">
            <div className="flex justify-center">
              <div className="relative w-full max-w-xs">
                <div className="aspect-square overflow-hidden rounded-2xl bg-raffle-cream shadow-inner">
                  <img
                    src="https://http2.mlstatic.com/D_NQ_NP_2X_964198-MLU72637163203_112023-F.webp"
                    alt="Fritadeira Air Fryer Elgin Facilita Fry 3,5L Preta"
                    className="h-full w-full object-contain p-4"
                    loading="eager"
                  />
                </div>
                <div className="absolute -right-2 -top-2 rounded-full bg-raffle-gold px-3 py-1 text-sm font-bold text-foreground shadow-md">
                  + R$ 500 PIX
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold text-foreground">
                O que está em jogo?
              </h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Gift className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground">
                    1 Fritadeira Air Fryer Elgin Facilita Fry 3,5L (1400W, Cor Preto)
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground">
                    R$ 500,00 direto no seu PIX
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground">
                    Pagamento 100% seguro via Mercado Pago
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground">
                    PIX gerado automaticamente com validação em tempo real
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Grid section */}
        <div className="mt-8 rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">
                Escolha seus números
              </h2>
              <p className="text-sm text-muted-foreground">
                Clique nos números disponíveis. {paidCount} pagos, {pendingCount} reservados, {availableCount} disponíveis.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-raffle-green" />
                Disponível
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-raffle-yellow" />
                Reservado
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-raffle-gray" />
                Pago
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Carregando números...</span>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-destructive/10 py-8 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Erro ao carregar números. Recarregue a página.
            </div>
          ) : (
            <NumberGrid
              numbers={mappedNumbers}
              selected={selected}
              onToggle={handleToggle}
            />
          )}

          {selected.length > 0 && (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {selectedCount} número{selectedCount !== 1 ? "s" : ""} selecionado{selectedCount !== 1 ? "s" : ""}
                </span>
                <span className="mx-2">·</span>
                Total: {" "}
                <span className="font-semibold text-primary">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(total)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClear}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar
                </Button>
                <Button
                  size="sm"
                  className="raffle-gradient border-0 font-semibold"
                  onClick={handleOpenCheckout}
                >
                  <Ticket className="mr-2 h-4 w-4" />
                  Gerar PIX
                </Button>
              </div>
            </div>
          )}

          {error && !checkoutOpen && !pixOpen && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Info cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-md">
            <h3 className="font-semibold text-foreground">Como funciona?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha seus números, preencha seus dados e pague via PIX. Após a
              confirmação, seus números são garantidos.
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-md">
            <h3 className="font-semibold text-foreground">Pagamento seguro</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Integração oficial com o Mercado Pago. Seus dados são processados de
              forma criptografada.
            </p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-md">
            <h3 className="font-semibold text-foreground">Sorteio</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              O ganhador será anunciado em nossas redes sociais e contatado pelo
              WhatsApp cadastrado.
            </p>
          </div>
        </div>

        <footer className="mt-12 pb-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Rifa Online. Todos os direitos reservados.
        </footer>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        selectedCount={selectedCount}
        total={total}
        onSubmit={handleSubmitCheckout}
        isLoading={isGenerating}
      />

      {activeOrder && (
        <PixPaymentDialog
          open={pixOpen}
          onOpenChange={setPixOpen}
          orderId={activeOrder.orderId}
          qrBase64={activeOrder.qrBase64}
          qrCopiaCola={activeOrder.qrCopiaCola}
          expiresAt={activeOrder.expiresAt}
          onExpired={handleExpired}
          onPaid={handlePaid}
        />
      )}
    </div>
  );
}
