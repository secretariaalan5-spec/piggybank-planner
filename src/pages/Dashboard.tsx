import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTransactions, useProfile, useAccounts, useInsights } from "@/hooks/useFinance";
import { AddTransactionSheet } from "@/components/dashboard/AddTransactionSheet";
import { QuickMessageInput } from "@/components/dashboard/QuickMessageInput";
import { TransactionItem } from "@/components/dashboard/TransactionItem";
import { formatBRL } from "@/lib/format";
import {
  Eye, EyeOff, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Wallet, Plus, MessageSquare, ArrowRight, Sparkles, Target,
  PiggyBank, ShoppingCart, Coffee, Car, Home, Zap
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTHS_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const CAT_ICONS: Record<string, React.ElementType> = {
  alimentação: Coffee, transporte: Car, moradia: Home,
  saúde: Zap, assinaturas: Zap, outros: ShoppingCart,
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

// ── Card de Categoria ──────────────────────────────────────────────────────────
const CatCard = ({ name, value, total, color, delay }: {
  name: string; value: number; total: number; color: string; delay: number;
}) => {
  const Icon = CAT_ICONS[name.toLowerCase()] ?? ShoppingCart;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.35 }}
      className="glass border border-border/60 rounded-2xl p-4 shadow-card flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: color + "22" }}>
          <Icon className="h-4 w-4" style={{ color }} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: color + "22", color }}>{pct}%</span>
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium truncate">{name}</p>
        <p className="font-display font-bold text-base tabular-nums mt-0.5">{formatBRL(value)}</p>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: delay + 0.2, duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </motion.div>
  );
};

// ── Card de Conta ──────────────────────────────────────────────────────────────
const AccountCard = ({ account }: { account: any }) => {
  const isCredit = account.type === "credit";
  const usedPct = isCredit && account.credit_limit > 0
    ? Math.min(Math.round((Number(account.balance) / Number(account.credit_limit)) * 100), 100)
    : 0;
  return (
    <div className="glass border border-border/60 rounded-2xl p-4 shadow-card flex items-center gap-3 shrink-0 w-52">
      <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: account.color + "22" }}>
        <Wallet className="h-4.5 w-4.5" style={{ color: account.color }} strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">{account.name}</p>
        <p className={`font-display font-bold text-sm tabular-nums ${isCredit ? "text-destructive" : "text-success"}`}>
          {isCredit ? "-" : ""}{formatBRL(Number(account.balance))}
        </p>
        {isCredit && account.credit_limit > 0 && (
          <div className="mt-1.5 h-1 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-destructive/60" style={{ width: `${usedPct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
};

// ── Dashboard ──────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year,  setYear]  = useState(now.getFullYear());
  const [hidden, setHidden]  = useState(false);
  const [showAI, setShowAI]  = useState(false);

  const { data: profile }           = useProfile();
  const { data: transactions = [] } = useTransactions();
  const { data: accounts = [] }     = useAccounts();
  const { data: insights = [] }     = useInsights();

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };
  const isCurrent = month === now.getMonth() && year === now.getFullYear();

  const inMonth = useMemo(() =>
    transactions.filter((t: any) => {
      const d = new Date(t.date + "T12:00:00");
      return d.getMonth() === month && d.getFullYear() === year;
    }), [transactions, month, year]);

  const income  = useMemo(() => inMonth.filter((t: any) => t.type === "income" ).reduce((s: number, t: any) => s + Number(t.amount), 0), [inMonth]);
  const expense = useMemo(() => inMonth.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0), [inMonth]);
  const balance = income - expense;

  // Agrupa por categoria
  const catSlices = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    inMonth.filter((t: any) => t.type === "expense").forEach((t: any) => {
      const k = t.categories?.name || "Outros";
      const cur = map.get(k) || { name: k, value: 0, color: t.categories?.color || "#10b981" };
      cur.value += Number(t.amount);
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [inMonth]);

  // Saúde financeira
  const healthPct = income > 0 ? Math.min(Math.round((expense / income) * 100), 100) : (expense > 0 ? 100 : 0);
  const healthColor = healthPct > 90 ? "text-destructive" : healthPct > 70 ? "text-amber-500" : "text-success";
  const healthBg    = healthPct > 90 ? "bg-destructive" : healthPct > 70 ? "bg-amber-500" : "bg-success";
  const healthLabel = healthPct > 90 ? "Atenção 🚨" : healthPct > 70 ? "Moderado ⚠️" : "Saudável ✅";

  const recentTx = (isCurrent ? transactions : inMonth).slice(0, 5);
  const topInsight = insights[0];
  const v = (n: number) => hidden ? "R$ ••••" : formatBRL(n);

  return (
    <div className="px-4 pt-5 pb-32 space-y-5">

      {/* ─── Header ─── */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{greeting()},</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">
            {profile?.display_name || "amigo(a)"} 👋
          </h1>
        </div>
        <button onClick={() => setHidden(h => !h)}
          className="h-10 w-10 rounded-2xl glass border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition">
          {hidden ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </header>

      {/* ─── Hero Card: Saldo ─── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl gradient-primary p-6 shadow-glow text-primary-foreground">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-12 h-36 w-36 rounded-full bg-black/10 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          {/* Navegação de mês */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center hover:bg-white/25 transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold opacity-90">{MONTHS_FULL[month]} {year}</p>
            <button onClick={nextMonth} disabled={isCurrent}
              className="h-8 w-8 rounded-xl bg-white/15 flex items-center justify-center hover:bg-white/25 transition disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Saldo */}
          <div className="text-center mb-5">
            <p className="text-xs opacity-70 uppercase tracking-widest mb-1">Saldo do mês</p>
            <AnimatePresence mode="wait">
              <motion.p key={`${month}-${year}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="font-display text-4xl font-extrabold tabular-nums">
                {hidden ? "R$ ••••••" : formatBRL(balance)}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Receita / Despesa */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/12 backdrop-blur-sm rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-xs opacity-75 mb-1">
                <TrendingUp className="h-3.5 w-3.5" /> Receitas
              </div>
              <p className="font-display font-bold text-lg tabular-nums">{v(income)}</p>
            </div>
            <div className="bg-white/12 backdrop-blur-sm rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-xs opacity-75 mb-1">
                <TrendingDown className="h-3.5 w-3.5" /> Despesas
              </div>
              <p className="font-display font-bold text-lg tabular-nums">{v(expense)}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Ações Rápidas ─── */}
      <div className="grid grid-cols-2 gap-3">
        <AddTransactionSheet trigger={
          <button className="flex items-center justify-center gap-2 h-12 w-full gradient-primary text-primary-foreground rounded-2xl font-semibold text-sm shadow-glow hover:opacity-90 active:scale-95 transition-all">
            <Plus className="h-4 w-4" /> Novo lançamento
          </button>
        } />
        <button onClick={() => setShowAI(a => !a)}
          className={`flex items-center justify-center gap-2 h-12 w-full rounded-2xl font-semibold text-sm border transition-all active:scale-95 ${
            showAI ? "gradient-primary text-primary-foreground shadow-glow border-transparent"
                   : "glass border-border/60 hover:border-primary/40"}`}>
          <MessageSquare className="h-4 w-4" /> Registrar por IA
        </button>
      </div>

      {/* ─── Widget IA ─── */}
      <AnimatePresence>
        {showAI && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} style={{ overflow: "hidden" }}>
            <QuickMessageInput />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Card: Saúde Financeira ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass border border-border/60 rounded-3xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Saúde financeira</p>
            <p className={`font-display font-bold text-lg mt-0.5 ${healthColor}`}>{healthLabel}</p>
          </div>
          <div className="relative w-16 h-16">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={[{ value: healthPct }, { value: 100 - healthPct }]} dataKey="value"
                  innerRadius={22} outerRadius={30} startAngle={90} endAngle={-270} paddingAngle={0} stroke="none">
                  <Cell fill={healthPct > 90 ? "hsl(var(--destructive))" : healthPct > 70 ? "#f59e0b" : "hsl(var(--success))"} />
                  <Cell fill="hsl(var(--muted))" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-[11px] font-extrabold tabular-nums ${healthColor}`}>{healthPct}%</span>
            </div>
          </div>
        </div>
        <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${healthPct}%` }}
            transition={{ duration: 1, ease: "easeOut" }} className={`h-full rounded-full ${healthBg}`} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          {income > 0 ? `Você usou ${v(expense)} de ${v(income)} neste mês` : "Adicione sua renda para acompanhar a saúde financeira"}
        </p>
      </motion.div>

      {/* ─── Cards: Categorias de Gasto ─── */}
      {catSlices.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display font-semibold text-sm">Gastos por categoria</h2>
              <p className="text-xs text-muted-foreground">{catSlices.length} categorias em {MONTHS[month]}</p>
            </div>
            <Link to="/app/insights" className="flex items-center gap-1 text-xs text-primary font-semibold">
              Ver análise <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {catSlices.slice(0, 6).map((cat, i) => (
              <CatCard key={cat.name} name={cat.name} value={cat.value} total={expense} color={cat.color} delay={i * 0.05} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Cards: Contas ─── */}
      {accounts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-display font-semibold text-sm">Minhas contas</h2>
              <p className="text-xs text-muted-foreground">{accounts.length} conta{accounts.length > 1 ? "s" : ""} ativa{accounts.length > 1 ? "s" : ""}</p>
            </div>
            <Link to="/app/accounts" className="flex items-center gap-1 text-xs text-primary font-semibold">
              Gerenciar <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {accounts.map(acc => <AccountCard key={acc.id} account={acc} />)}
            {/* Card de adicionar conta */}
            <Link to="/app/accounts"
              className="glass border border-dashed border-border/60 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 shrink-0 w-40 text-muted-foreground hover:text-primary hover:border-primary/40 transition-all">
              <Plus className="h-5 w-5" />
              <span className="text-xs font-semibold">Nova conta</span>
            </Link>
          </div>
        </section>
      )}

      {/* ─── Card: Meta rápida ─── */}
      <Link to="/app/goals"
        className="block glass border border-border/60 rounded-3xl p-5 shadow-card group hover:border-primary/30 transition-all">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <Target className="h-5 w-5 text-primary" strokeWidth={2.2} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium">Metas financeiras</p>
            <p className="font-display font-semibold text-sm">Acompanhe seus objetivos →</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </Link>

      {/* ─── Card: Insight IA ─── */}
      {topInsight && (
        <Link to="/app/insights" className="block glass border border-primary/25 rounded-3xl p-5 shadow-card group">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center shadow-glow shrink-0">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Dica do Pigly ✨</p>
              <p className="font-display font-semibold text-sm mt-0.5 line-clamp-2">{topInsight.title}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground self-center group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {/* ─── Card: Últimas Transações ─── */}
      <section className="glass border border-border/60 rounded-3xl shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="font-display font-semibold">Últimas transações</h2>
            <p className="text-xs text-muted-foreground">{recentTx.length} lançamento{recentTx.length !== 1 ? "s" : ""}</p>
          </div>
          <Link to="/app/transactions" className="flex items-center gap-1 text-xs text-primary font-semibold">
            Ver tudo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentTx.length === 0 ? (
          <div className="px-5 pb-7 text-center">
            <PiggyBank className="h-12 w-12 text-muted-foreground/25 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-sm font-medium text-muted-foreground">Nenhum lançamento ainda</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Use o botão acima para começar!</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40 px-5">
            {recentTx.map((t: any) => (
              <li key={t.id}>
                <TransactionItem description={t.description} amount={Number(t.amount)}
                  type={t.type} date={t.date} category={t.categories} account={t.accounts} />
              </li>
            ))}
          </ul>
        )}

        {recentTx.length > 0 && (
          <Link to="/app/transactions"
            className="flex items-center justify-center gap-1.5 py-4 text-xs text-muted-foreground hover:text-primary transition border-t border-border/40">
            Ver todas as transações <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
