import * as Icons from "lucide-react";
import { formatBRL, formatDate } from "@/lib/format";
import { motion, useAnimation } from "framer-motion";
import { useDeleteTransaction } from "@/hooks/useFinance";

interface Props {
  id?: string;
  description: string | null;
  amount: number;
  type: "income" | "expense";
  date: string;
  category?: { name: string; icon: string; color: string } | null;
  account?: { name: string; type: string } | null;
  installment_total?: number | null;
  installment_current?: number | null;
}

export const TransactionItem = ({ id, description, amount, type, date, category, account, installment_total, installment_current }: Props) => {
  const Icon = (Icons as any)[category?.icon || "Wallet"] ?? Icons.Wallet;
  const sign = type === "income" ? "+" : "−";
  const tone = type === "income" ? "text-success" : "text-foreground";
  const isParcel = installment_total && installment_total > 1;

  const controls = useAnimation();
  const deleteTx = useDeleteTransaction();

  const handleDragEnd = (e: any, info: any) => {
    // Se arrastou mais de 60px para a esquerda, apaga
    if (info.offset.x < -60 && id) {
      deleteTx.mutate(id);
    } else {
      // Volta para a posição original se não arrastou o suficiente
      controls.start({ x: 0 });
    }
  };

  return (
    <div className="relative overflow-hidden group">
      {/* Fundo vermelho com lixeira (revelado ao arrastar) */}
      <div className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-end pr-5 rounded-r-xl">
        <Icons.Trash2 className="h-5 w-5 text-white" />
      </div>

      {/* Item real (arrastável) */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        onDragEnd={handleDragEnd}
        animate={controls}
        whileTap={{ cursor: "grabbing" }}
        className="relative bg-background flex items-center gap-3 py-3 px-1 cursor-grab"
      >
        <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${category?.color || "#10b981"}22`, color: category?.color || "#10b981" }}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{description?.split(' (')[0] || category?.name || "Lançamento"}</p>
            {isParcel && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-muted text-muted-foreground rounded-md uppercase tracking-tighter">
                {installment_current}/{installment_total}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {category?.name} {account ? `· ${account.name}` : ""} · {formatDate(date)}
          </p>
        </div>
        <p className={`font-display font-bold text-sm tabular-nums ${tone}`}>{sign}{formatBRL(Math.abs(amount))}</p>
      </motion.div>
    </div>
  );
};