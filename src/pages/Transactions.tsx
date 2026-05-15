import { useMemo, useState } from "react";
import { useTransactions } from "@/hooks/useFinance";
import { TransactionItem } from "@/components/dashboard/TransactionItem";
import { AddTransactionSheet } from "@/components/dashboard/AddTransactionSheet";
import { formatLongDate } from "@/lib/format";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

const Transactions = () => {
  const { data: transactions = [], isLoading } = useTransactions();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const grouped = useMemo(() => {
    const list = transactions.filter((t: any) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (q) {
        const s = q.toLowerCase();
        return (t.description?.toLowerCase().includes(s) || t.categories?.name?.toLowerCase().includes(s));
      }
      return true;
    });
    const map = new Map<string, any[]>();
    list.forEach((t: any) => {
      const arr = map.get(t.date) || [];
      arr.push(t);
      map.set(t.date, arr);
    });
    return Array.from(map.entries());
  }, [transactions, q, filter]);

  return (
    <div className="px-5 pt-6 pb-36 space-y-4 relative">
      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Extrato</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" className="pl-9 h-12 rounded-2xl bg-muted/50 border-none focus-visible:ring-primary/30" />
      </div>

      <div className="grid grid-cols-3 gap-2 p-1 bg-muted/50 rounded-2xl">
        {([["all", "Todos"], ["income", "Ganhei"], ["expense", "Gastei"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k as any)} className={`py-2 rounded-xl text-xs font-semibold transition ${filter === k ? "bg-card shadow-card text-foreground" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-12 font-medium">Carregando…</p>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-16 w-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <p className="font-display font-semibold text-foreground">Nada por aqui ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Tente buscar por outro termo.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, items]) => (
            <section key={date} className="glass border border-border/60 rounded-3xl p-4 shadow-card">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 ml-1">{formatLongDate(date)}</p>
              <ul className="divide-y divide-border/30">
                {items.map((t: any) => (
                  <li key={t.id}>
                    <TransactionItem 
                      id={t.id}
                      description={t.description} 
                      amount={Number(t.amount)} 
                      type={t.type} 
                      date={t.date} 
                      category={t.categories} 
                      account={t.accounts} 
                      installment_total={t.installment_total}
                      installment_current={t.installment_current}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="fixed bottom-28 right-6 z-40">
        <AddTransactionSheet trigger={
          <button className="h-14 w-14 rounded-full gradient-primary shadow-glow flex items-center justify-center text-primary-foreground active:scale-90 transition-transform">
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </button>
        } />
      </div>
    </div>
  );
};

export default Transactions;