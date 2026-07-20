import { useMemo } from "react";

export type NumberStatus = "available" | "pending" | "paid";

interface NumberGridProps {
  numbers: Array<{ number: number; status: NumberStatus }>;
  selected: number[];
  onToggle: (number: number) => void;
}

export function NumberGrid({ numbers, selected, onToggle }: NumberGridProps) {
  const sorted = useMemo(
    () => [...numbers].sort((a, b) => a.number - b.number),
    [numbers],
  );

  return (
    <div className="raffle-grid">
      {sorted.map((item) => {
        const isSelected = selected.includes(item.number);
        const label = item.number.toString().padStart(2, "0");

        let statusClasses = "bg-raffle-green text-white hover:bg-raffle-green-dark";
        if (item.status === "pending") {
          statusClasses = "bg-raffle-yellow text-raffle-yellow-dark cursor-not-allowed opacity-90";
        } else if (item.status === "paid") {
          statusClasses = "bg-raffle-gray text-white cursor-not-allowed opacity-70";
        } else if (isSelected) {
          statusClasses = "bg-primary text-white ring-2 ring-primary ring-offset-2";
        }

        return (
          <button
            key={item.number}
            type="button"
            disabled={item.status !== "available"}
            onClick={() => onToggle(item.number)}
            className={`
              relative flex items-center justify-center rounded-md py-2 text-sm font-semibold
              transition-all active:scale-95 disabled:active:scale-100
              ${statusClasses}
            `}
            aria-label={`Número ${label}${item.status === "available" ? isSelected ? " selecionado" : " disponível" : item.status === "pending" ? " reservado" : " pago"}`}
          >
            {label}
            {isSelected && item.status === "available" && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3 items-center justify-center rounded-full bg-raffle-gold text-[8px] font-bold text-foreground">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
