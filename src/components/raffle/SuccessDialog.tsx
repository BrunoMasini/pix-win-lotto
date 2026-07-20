import { PartyPopper } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SuccessDialog({ open, onOpenChange }: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-raffle-green text-white">
            <PartyPopper className="h-8 w-8" />
          </div>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl">Pagamento confirmado!</DialogTitle>
            <DialogDescription className="text-base">
              Seus números foram garantidos. Boa sorte no sorteio! Entraremos em contato pelo WhatsApp assim que ocorrer o sorteio.
            </DialogDescription>
          </DialogHeader>
          <Button
            className="w-full bg-raffle-green text-white hover:bg-raffle-green-dark"
            onClick={() => onOpenChange(false)}
          >
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
