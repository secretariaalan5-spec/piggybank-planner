import * as Icons from "lucide-react";
import { formatBRL, formatDate } from "@/lib/format";

interface Props {
  description: string | null;
  amount: number;
  type: "income" | "expense";
  date: string;
  category?: { name: string; icon: string; color: string } | null;
  account?: { name: string; type: string } | null;
  installment_total?: number | null;
  installment_current?: number | null;
}

export const TransactionItem = ({ description, amount, type, date, category, account, installment_total, installment_current }: Props) => {
  const Icon = (Icons as any)[category?.icon || "Wallet"] ?? Icons.Wallet;
  const sign = type === "income" ? "+" : "−";
  const tone = type === "income" ? "text-success" : "text-foreground";
  const isParcel = installment_total && installment_total > 1;

  return (
    <div className="flex items-center gap-3 py-3 group">
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
    </div>
  );
};
