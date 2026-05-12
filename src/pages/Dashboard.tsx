import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTransactions, useProfile, useInsights } from "@/hooks/useFinance";
import { BalanceCard } from "@/components/dashboard/BalanceCard";
import { SpendingChart } from "@/components/dashboard/SpendingChart";
import { TransactionItem } from "@/components/dashboard/TransactionItem";
import { AddTransactionSheet } from "@/components/dashboard/AddTransactionSheet";
import { PiggyMascot } from "@/components/PiggyMascot";
import { QuickMessageInput } from "@/components/dashboard/QuickMessageInput";
import { ChevronRight, Sparkles } from "lucide-react";

const Dashboard = () => {
  const { data: profile } = useProfile();
  const { data: transactions = [], isLoading } = useTransactions();
  const { data: insights = [] } = useInsights();

  const stats = useMemo(() => {
    const now = new Date();
    const month = now.getMonth(), year = now.getFullYear();
    const inMonth = transactions.filter((t: any) => {
      const d = new Date(t.date + "T00:00:00");
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const income = inMonth.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const expense = inMonth.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);
    const byCat = new Map<string, { name: string; value: number; color: string }>();
    inMonth.filter((t: any) => t.type === "expense").forEach((t: any) => {
      const k = t.categories?.name || "Outros";
      const cur = byCat.get(k) || { name: k, value: 0, color: t.categories?.color || "#10b981" };
      cur.value += Number(t.amount);
      byCat.set(k, cur);
    });
    return { income, expense, balance: income - expense, slices: Array.from(byCat.values()).sort((a, b) => b.value - a.value) };
  }, [transactions]);

  const topInsight = insights[0];

  return (
    <div className="px-5 pt-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Olá,</p>
          <h1 className="font-display text-2xl font-bold tracking-tight">{profile?.display_name || "amigo(a)"} 👋</h1>
        </div>
        <PiggyMascot size={56} />
      </header>

      <BalanceCard balance={stats.balance} income={stats.income} expense={stats.expense} />

      <QuickMessageInput />

      {topInsight ? (
        <Link to="/app/insights" className="block glass border border-border/60 rounded-3xl p-4 shadow-card group">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center shadow-glow shrink-0">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary font-semibold uppercase tracking-wider">Dica do Pigly</p>
              <p className="font-display font-semibold text-sm mt-0.5 line-clamp-2">{topInsight.title}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground self-center" />
          </div>
        </Link>
      ) : null}

      <SpendingChart data={stats.slices} />

      <section className="glass border border-border/60 rounded-3xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-display font-semibold">Últimos lançamentos</h3>
          <Link to="/app/transactions" className="text-xs text-primary font-semibold">Ver tudo</Link>
        </div>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum lançamento ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Toque no + para começar.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {transactions.slice(0, 5).map((t: any) => (
              <li key={t.id}><TransactionItem description={t.description} amount={Number(t.amount)} type={t.type} date={t.date} category={t.categories} account={t.accounts} /></li>
            ))}
          </ul>
        )}
      </section>

      <div className="fixed bottom-24 right-4 z-40 max-w-[460px] mx-auto w-full pointer-events-none flex justify-end pr-4">
        <div className="pointer-events-auto"><AddTransactionSheet /></div>
      </div>
    </div>
  );
};

export default Dashboard;
