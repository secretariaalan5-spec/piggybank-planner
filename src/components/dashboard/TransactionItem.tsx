import * as Icons from "lucide-react";
import { formatBRL, formatDate } from "@/lib/format";

interface Props {
  description: string | null;
  amount: number;
  type: "income" | "expense";
  date: string;
  category?: { name: string; icon: string; color: string } | null;
  account?: { name: string; type: string } | null;
}

export const TransactionItem = ({ description, amount, type, date, category, account }: Props) => {
  const Icon = (Icons as any)[category?.icon || "Wallet"] ?? Icons.Wallet;
  const sign = type === "income" ? "+" : "−";
  const tone = type === "income" ? "text-success" : "text-foreground";
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${category?.color || "#10b981"}22`, color: category?.color || "#10b981" }}>
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{description || category?.name || "Lançamento"}</p>
        <p className="text-xs text-muted-foreground">
          {category?.name} {account ? `· ${account.name}` : ""} · {formatDate(date)}
        </p>
      </div>
      <p className={`font-display font-bold text-sm tabular-nums ${tone}`}>{sign}{formatBRL(Math.abs(amount))}</p>
    </div>
  );
};

