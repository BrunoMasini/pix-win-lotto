import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Check, Clock, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getOrderStatus } from "@/lib/raffle.functions";
import { SuccessDialog } from "./SuccessDialog";

interface PixPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  qrBase64: string;
  qrCopiaCola: string;
  expiresAt: string;
  onExpired: () => void;
  onPaid: () => void;
}

export function PixPaymentDialog({
  open,
  onOpenChange,
  orderId,
  qrBase64,
  qrCopiaCola,
  expiresAt,
  onExpired,
  onPaid,
}: PixPaymentDialogProps) {
  const [copied, setCopied] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const fetchStatus = useServerFn(getOrderStatus);
  const queryClient = useQueryClient();

  const expiresAtDate = useMemo(() => new Date(expiresAt), [expiresAt]);
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(0, Math.floor((expiresAtDate.getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    if (!open) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((expiresAtDate.getTime() - Date.now()) / 1000),
      );
      setRemainingSeconds(remaining);

      if (remaining === 0) {
        onExpired();
        onOpenChange(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [open, expiresAtDate, onExpired, onOpenChange]);

  const { data: status } = useQuery({
    queryKey: ["order-status", orderId],
    queryFn: () => fetchStatus({ data: { orderId: orderId! } }),
    enabled: open && !!orderId,
    refetchInterval: 3000,
    staleTime: 0,
  });

  useEffect(() => {
    if (status?.status === "paid") {
      queryClient.invalidateQueries({ queryKey: ["raffle-numbers"] });
      setSuccessOpen(true);
      onOpenChange(false);
      onPaid();
    } else if (status?.status === "expired" || status?.status === "cancelled") {
      onExpired();
      onOpenChange(false);
    }
  }, [status, onExpired, onPaid, onOpenChange, queryClient]);

  const copyToClipboard = async () => {
    if (!qrCopiaCola) return;
    try {
      await navigator.clipboard.writeText(qrCopiaCola);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("textarea");
      input.value = qrCopiaCola;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">
              Aguardando pagamento
            </DialogTitle>
            <DialogDescription className="text-center">
              Escaneie o QR Code ou copie o código PIX para pagar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {qrBase64 ? (
              <div className="rounded-lg border border-border bg-white p-2">
                <img
                  src={`data:image/png;base64,${qrBase64}`}
                  alt="QR Code PIX"
                  className="h-56 w-56 object-contain"
                />
              </div>
            ) : (
              <div className="flex h-56 w-56 items-center justify-center rounded-lg border border-border bg-muted">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            <div className="flex w-full items-center justify-center gap-2 rounded-full bg-raffle-cream px-4 py-2 text-sm font-medium text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Expira em {formatTime(remainingSeconds)}
            </div>

            <div className="flex w-full items-center justify-center gap-2 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              Aguardando confirmação do PIX...
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={copyToClipboard}
              disabled={!qrCopiaCola}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Código copiado!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar código PIX
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SuccessDialog open={successOpen} onOpenChange={setSuccessOpen} />
    </>
  );
}
