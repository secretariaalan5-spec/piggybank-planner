import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  useTransactions, useProfile, useInsights, useAccounts
} from "@/hooks/useFinance";
import { AddTransactionSheet } from "@/components/dashboard/AddTransactionSheet";
import { QuickMessageInput } from "@/components/dashboard/QuickMessageInput";
import { TransactionItem } from "@/components/dashboard/TransactionItem";
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Wallet, Sparkles, ArrowRight, Plus, MessageSquare,
  BarChart3, PiggyBank
} from "lucide-react";
import { formatBRL } from "@/lib/format";
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Eye, EyeOff } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────
const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

const CATEGORY_COLORS = [
  "#10b981","#3b82f6","#8b5cf6","#f59e0b","#ef4444",
  "#ec4899","#06b6d4","#f97316","#6366f1","#14b8a6",
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

// ── Componente: KPI Card ───────────────────────────────────────────────────────
interface KpiProps {
  label: string;
  value: number;
  delta?: number;
  icon: React.ElementType;
  color: "success" | "destructive" | "primary";
  hidden: boolean;
  delay?: number;
}

const KpiCard = ({ label, value, icon: Icon, color, hidden, delay = 0 }: KpiProps) => {
  const colorMap = {
    success:     { bg: "bg-success/10",     text: "text-success",     icon: "text-success"    },
    destructive: { bg: "bg-destructive/10", text: "text-destructive", icon: "text-destructive"},
    primary:     { bg: "bg-primary/10",     text: "text-primary",     icon: "text-primary"    },
  };
  const c = colorMap[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.32, 0.72, 0.24, 1] }}
      className="glass border border-border/60 rounded-2xl p-4 shadow-card flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{label}</span>
        <div className={`h-8 w-8 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${c.icon}`} strokeWidth={2.2} />
        </div>
      </div>
      <p className={`font-display font-extrabold text-xl tabular-nums ${c.text}`}>
        {hidden ? "R$ ••••" : formatBRL(value)}
      </p>
    </motion.div>
  );
};

// ── Componente: Gráfico de barras semanal ────────────────────────────────────
interface DayBar { day: string; income: number; expense: number; }
const WeeklyChart = ({ bars }: { bars: DayBar[] }) => (
  <div className="glass border border-border/60 rounded-3xl p-5 shadow-card">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="font-display font-semibold text-sm">Últimos 7 dias</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Receitas vs Despesas</p>
      </div>
      <BarChart3 className="h-4 w-4 text-muted-foreground" />
    </div>
    <ResponsiveContainer width="100%" height={96}>
      <BarChart data={bars} barGap={2} barCategoryGap="30%">
        <Tooltip
          contentStyle={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            borderRadius: 12, fontSize: 11, padding: "6px 10px",
          }}
          formatter={(v: number, name: string) => [
            formatBRL(v),
            name === "income" ? "Receita" : "Despesa"
          ]}
          cursor={false}
        />
        <Bar dataKey="income" radius={[4, 4, 0, 0]}>
          {bars.map((_, i) => <Cell key={i} fill="hsl(var(--success) / 0.7)" />)}
        </Bar>
        <Bar dataKey="expense" radius={[4, 4, 0, 0]}>
          {bars.map((_, i) => <Cell key={i} fill="hsl(var(--destructive) / 0.7)" />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    <div className="flex items-center gap-4 mt-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="w-2.5 h-2.5 rounded-sm bg-success/70 inline-block" />
        Receita
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="w-2.5 h-2.5 rounded-sm bg-destructive/70 inline-block" />
        Despesa
      </div>
    </div>
  </div>
);

// ── Componente: Barra de saúde financeira ────────────────────────────────────
const HealthBar = ({ income, expense }: { income: number; expense: number }) => {
  const pct = income > 0 ? Math.min(Math.round((expense / income) * 100), 100) : (expense > 0 ? 100 : 0);
  const color = pct > 90 ? "bg-destructive" : pct > 70 ? "bg-amber-500" : "bg-success";
  const label = pct > 90 ? "Atenção" : pct > 70 ? "Moderado" : "Saudável";
  const labelColor = pct > 90 ? "text-destructive" : pct > 70 ? "text-amber-500" : "text-success";
  return (
    <div className="glass border border-border/60 rounded-2xl p-4 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Saúde do mês</span>
        <span className={`text-xs font-bold ${labelColor}`}>{label} · {pct}%</span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        {income > 0
          ? `Você usou ${pct}% da sua renda`
          : "Adicione sua renda para ver a saúde financeira"}
      </p>
    </div>
  );
};

// ── Componente: Card de contas ────────────────────────────────────────────────
const AccountsStrip = ({ accounts }: { accounts: any[] }) => {
  if (!accounts.length) return null;
  const total = accounts.filter(a => a.type !== "credit").reduce((s, a) => s + Number(a.balance), 0);
  return (
    <div className="glass border border-border/60 rounded-2xl px-4 py-3 shadow-card flex items-center gap-3">
      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <PiggyBank className="h-4.5 w-4.5 text-primary" strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium">Patrimônio líquido</p>
        <p className="font-display font-bold text-base tabular-nums">{formatBRL(total)}</p>
      </div>
      <Link to="/app/accounts" className="flex items-center gap-1 text-xs text-primary font-semibold">
        Ver <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
};

// ── Dashboard Principal ───────────────────────────────────────────────────────
const Dashboard = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear]   = useState(now.getFullYear());
  const [hidden, setHidden] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const { data: profile }                = useProfile();
  const { data: transactions = [] }      = useTransactions();
  const { data: insights = [] }          = useInsights();
  const { data: accounts = [] }          = useAccounts();

  // Navegar entre meses
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();

  // Filtra transações do mês selecionado
  const inMonth = useMemo(() =>
    transactions.filter((t: any) => {
      const d = new Date(t.date + "T12:00:00");
      return d.getMonth() === month && d.getFullYear() === year;
    }), [transactions, month, year]);

  const income  = useMemo(() => inMonth.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0), [inMonth]);
  const expense = useMemo(() => inMonth.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0), [inMonth]);
  const balance = income - expense;

  // Últimos 7 dias para gráfico de barras
  const weekBars: DayBar[] = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return days.map(d => {
      const key = d.toISOString().split("T")[0];
      const dayTx = transactions.filter((t: any) => t.date === key);
      return {
        day: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        income:  dayTx.filter((t: any) => t.type === "income").reduce((s: number, t: any)  => s + Number(t.amount), 0),
        expense: dayTx.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0),
      };
    });
  }, [transactions]);

  const topInsight = insights[0];
  const recentTx   = isCurrentMonth ? transactions.slice(0, 6) : inMonth.slice(0, 6);

  return (
    <div className="px-4 pt-5 pb-32 space-y-4">

      {/* ── Header ── */}
      <header className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{getGreeting()},</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight leading-tight">
            {profile?.display_name || "amigo(a)"} 👋
          </h1>
        </div>
        <button
          onClick={() => setHidden(h => !h)}
          className="h-10 w-10 rounded-2xl glass border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          aria-label="Ocultar valores"
        >
          {hidden ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
      </header>

      {/* ── Seletor de mês + Saldo ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl gradient-primary p-6 shadow-glow text-primary-foreground"
      >
        {/* Blobs decorativos */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-16 h-40 w-40 rounded-full bg-black/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Navegação de mês */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold opacity-90 tracking-wide">
              {MONTHS[month]} {year}
            </p>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Saldo principal */}
          <div className="text-center">
            <p className="text-xs opacity-70 uppercase tracking-widest mb-1">Saldo do mês</p>
            <AnimatePresence mode="wait">
              <motion.p
                key={`${month}-${year}-${balance}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="font-display text-4xl font-extrabold tabular-nums"
              >
                {hidden ? "R$ ••••••" : formatBRL(balance)}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Receita vs Despesa */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-xs opacity-75 mb-1">
                <TrendingUp className="h-3.5 w-3.5" /> Receitas
              </div>
              <p className="font-display font-bold text-lg tabular-nums">
                {hidden ? "••••" : formatBRL(income)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
              <div className="flex items-center gap-1.5 text-xs opacity-75 mb-1">
                <TrendingDown className="h-3.5 w-3.5" /> Despesas
              </div>
              <p className="font-display font-bold text-lg tabular-nums">
                {hidden ? "••••" : formatBRL(expense)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Receitas" value={income}  icon={TrendingUp}   color="success"     hidden={hidden} delay={0.05} />
        <KpiCard label="Despesas" value={expense} icon={TrendingDown} color="destructive" hidden={hidden} delay={0.1}  />
      </div>

      {/* ── Saúde financeira ── */}
      <HealthBar income={income} expense={expense} />

      {/* ── Patrimônio ── */}
      <AccountsStrip accounts={accounts} />

      {/* ── Ações rápidas ── */}
      <div className="grid grid-cols-2 gap-3">
        <AddTransactionSheet
          trigger={
            <button className="flex items-center justify-center gap-2 h-12 w-full gradient-primary text-primary-foreground rounded-2xl font-semibold text-sm shadow-glow hover:opacity-90 transition">
              <Plus className="h-4 w-4" />
              Novo lançamento
            </button>
          }
        />
        <button
          onClick={() => setShowAI(a => !a)}
          className={`flex items-center justify-center gap-2 h-12 w-full rounded-2xl font-semibold text-sm border transition ${
            showAI
              ? "gradient-primary text-primary-foreground shadow-glow"
              : "glass border-border/60 text-foreground hover:border-primary/40"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Registrar por IA
        </button>
      </div>

      {/* ── Widget IA (colapsável) ── */}
      <AnimatePresence>
        {showAI && (
          <motion.div
            initial={{ opacity: 0, height: 0, overflow: "hidden" }}
            animate={{ opacity: 1, height: "auto", overflow: "visible" }}
            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
            transition={{ duration: 0.3 }}
          >
            <QuickMessageInput />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Insight da IA ── */}
      {topInsight && (
        <Link to="/app/insights" className="block glass border border-primary/30 rounded-3xl p-4 shadow-card group">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center shadow-glow shrink-0">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Dica do Pigly</p>
              <p className="font-display font-semibold text-sm mt-0.5 line-clamp-2">{topInsight.title}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground self-center group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      )}

      {/* ── Gráfico semanal ── */}
      {isCurrentMonth && <WeeklyChart bars={weekBars} />}

      {/* ── Últimas transações ── */}
      <section className="glass border border-border/60 rounded-3xl shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h3 className="font-display font-semibold">
              {isCurrentMonth ? "Últimas transações" : `Transações · ${MONTHS[month]}`}
            </h3>
            <p className="text-xs text-muted-foreground">{recentTx.length} lançamentos</p>
          </div>
          <Link to="/app/transactions" className="flex items-center gap-1 text-xs text-primary font-semibold">
            Ver tudo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentTx.length === 0 ? (
          <div className="px-5 pb-6 text-center">
            <Wallet className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma transação neste período</p>
            <p className="text-xs text-muted-foreground mt-0.5">Toque em "Novo lançamento" para começar.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40 px-5">
            {recentTx.map((t: any) => (
              <li key={t.id}>
                <TransactionItem
                  description={t.description}
                  amount={Number(t.amount)}
                  type={t.type}
                  date={t.date}
                  category={t.categories}
                  account={t.accounts}
                />
              </li>
            ))}
          </ul>
        )}

        {recentTx.length > 0 && (
          <Link
            to="/app/transactions"
            className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground hover:text-primary transition border-t border-border/40"
          >
            Ver todas as transações <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
