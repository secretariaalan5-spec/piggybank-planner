import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useState } from "react";
import { formatBRL } from "@/lib/format";

interface Props { balance: number; income: number; expense: number; }

export const BalanceCard = ({ balance, income, expense }: Props) => {
  const [hidden, setHidden] = useState(false);
  const display = (v: number) => hidden ? "R$ ••••••" : formatBRL(v);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl gradient-primary p-6 shadow-glow text-primary-foreground"
    >
      <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -left-8 -bottom-12 h-40 w-40 rounded-full bg-accent/40 blur-2xl" />
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium opacity-80 uppercase tracking-wider">Saldo total</span>
          <button onClick={() => setHidden(h => !h)} aria-label="Mostrar/ocultar" className="p-1.5 rounded-lg hover:bg-white/10 transition">
            {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="font-display text-4xl font-extrabold tracking-tight mt-2 tabular-nums">{display(balance)}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-xs opacity-80"><ArrowDownRight className="h-3.5 w-3.5" /> Receitas</div>
            <p className="font-display font-bold text-lg mt-1 tabular-nums">{display(income)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-xs opacity-80"><ArrowUpRight className="h-3.5 w-3.5" /> Despesas</div>
            <p className="font-display font-bold text-lg mt-1 tabular-nums">{display(expense)}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
