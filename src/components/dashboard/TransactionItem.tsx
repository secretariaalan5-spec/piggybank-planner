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
  metodo_pagamento?: string | null;
}

export const TransactionItem = ({ id, description, amount, type, date, category, account, installment_total, installment_current, metodo_pagamento }: Props) => {
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
    <div className="relative overflow-hidden group -mx-4 px-4">
      {/* Item real (arrastável) */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        onDragEnd={handleDragEnd}
        animate={controls}
        whileTap={{ cursor: "grabbing" }}
        className="relative flex items-center w-full"
      >
        <div className="flex-1 flex items-center gap-3 py-3 px-1 cursor-grab">
          <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${category?.color || "#10b981"}22`, color: category?.color || "#10b981" }}>
            <Icon className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{description?.split(' (')[0] || category?.name || "Lançamento"}</p>
              {isParcel && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-md uppercase tracking-tighter">
                  {installment_current}/{installment_total}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
              <span>{category?.name}</span>
              {account && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="truncate max-w-[80px]">{account.name}</span>
                </>
              )}
              {metodo_pagamento && (
                <>
                  <span className="opacity-40">•</span>
                  <span className={`px-1.5 py-0.25 text-[9px] rounded font-semibold tracking-wide uppercase ${
                    metodo_pagamento === "credito" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                    metodo_pagamento === "debito" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                    metodo_pagamento === "pix" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                    "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {metodo_pagamento === "credito" ? "Crédito" :
                     metodo_pagamento === "debito" ? "Débito" :
                     metodo_pagamento === "pix" ? "Pix" : "Espécie"}
                  </span>
                </>
              )}
              <span className="opacity-40">•</span>
              <span>{formatDate(date)}</span>
            </div>
          </div>
          <p className={`font-display font-bold text-sm tabular-nums ${tone}`}>{sign}{formatBRL(Math.abs(amount))}</p>
        </div>

        {/* Botão de excluir que entra junto com o swipe */}
        <div className="absolute left-[calc(100%+24px)] inset-y-1 w-20 bg-destructive flex items-center justify-center rounded-xl">
          <Icons.Trash2 className="h-5 w-5 text-destructive-foreground" />
        </div>
      </motion.div>
    </div>
  );
};
