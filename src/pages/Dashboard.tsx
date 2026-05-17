import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTransactions, useProfile, useAccounts, useInsights } from "@/hooks/useFinance";
import { AddTransactionSheet } from "@/components/dashboard/AddTransactionSheet";
import { TransactionItem } from "@/components/dashboard/TransactionItem";
import { formatBRL } from "@/lib/format";
import {
  Bell, Eye, EyeOff, ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  Wallet, Plus, MessageSquare, ArrowRight, Sparkles, Target,
  PiggyBank, ShoppingCart, Coffee, Car, Home, Zap, ArrowLeftRight
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTHS_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const CAT_ICONS: Record<string, React.ElementType> = {
  alimentação: Coffee, transporte: Car, moradia: Home,
  saúde: Zap, assinaturas: Zap, mercado: ShoppingCart,
  compras: ShoppingCart, lazer: Target, outros: ShoppingCart,
};

const CAT_COLORS: Record<string, string> = {
  alimentação: "#f59e0b", // Amber
  transporte: "#3b82f6",  // Blue
  moradia: "#8b5cf6",     // Purple
  saúde: "#ec4899",       // Pink
  assinaturas: "#06b6d4", // Cyan
  lazer: "#10b981",       // Emerald
  educação: "#6366f1",    // Indigo
  mercado: "#14b8a6",     // Teal
  compras: "#f43f5e",     // Rose
  outros: "#64748b",      // Slate
};

const PALETTE = ["#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#10b981", "#6366f1", "#14b8a6", "#f43f5e"];

// ── Card de Categoria ──────────────────────────────────────────────────────────
const CatCard = ({ name, value, total, color, delay }: {
  name: string; value: number; total: number; color: string; delay: number;
}) => {
  const Icon = CAT_ICONS[name.toLowerCase()] ?? ShoppingCart;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  
  // Lógica simplificada para "nível crítico" apenas visual
  const isCritical = pct > 40; 
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.35 }}
      className="glass rounded-[20px] p-4 border border-border/60 shadow-card flex flex-col gap-3"
    >
      <div className="h-11 w-11 rounded-full flex items-center justify-center mb-1" style={{ background: color + "22" }}>
        <Icon className="h-5 w-5" style={{ color }} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[13px] text-muted-foreground font-medium truncate mb-1">{name}</p>
        <p className="font-display font-bold text-[22px] tracking-tight text-foreground">{formatBRL(value)}</p>
      </div>
      <div className="mt-2">
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: delay + 0.2, duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: isCritical ? "#ff4d4f" : color }}
          />
        </div>
        <p className={`text-[11px] font-medium ${isCritical ? 'text-red-500' : 'text-muted-foreground'}`}>
          {isCritical ? "Nível crítico" : `${pct}% do total`}
        </p>
      </div>
    </motion.div>
  );
};

// ── Dashboard ──────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [hidden, setHidden] = useState(false);

  const { data: profile } = useProfile();
  const { data: accounts = [] } = useAccounts();
  const { data: transactions = [] } = useTransactions();
  const { data: insights = [] } = useInsights();

  // Filtra transações do mês selecionado
  const inMonth = useMemo(() => {
    return transactions.filter((t: any) => {
      if (!t.date) return false;
      const [y, m] = t.date.split('-');
      return parseInt(m, 10) - 1 === month && parseInt(y, 10) === year;
    });
  }, [transactions, month, year]);

  const income = useMemo(() => inMonth.filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0), [inMonth]);
  const expense = useMemo(() => inMonth.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0), [inMonth]);
  const balance = income - expense;

  // Agrupa por categoria com paleta rica
  const catSlices = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    inMonth.filter((t: any) => t.type === "expense").forEach((t: any) => {
      const k = t.categories?.name || "Outros";
      const color = CAT_COLORS[k.toLowerCase()] || (t.categories?.color && t.categories.color !== "#10b981" ? t.categories.color : PALETTE[map.size % PALETTE.length]);
      const cur = map.get(k) || { name: k, value: 0, color };
      cur.value += Number(t.amount);
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [inMonth]);

  const v = (n: number) => hidden ? "R$ ••••" : formatBRL(n);

  return (
    <div className="px-5 pt-6 pb-32 space-y-8 bg-background min-h-screen">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
            <PiggyBank className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Olá, {profile?.display_name?.split(' ')[0] || "Economizador"}!
          </h1>
        </div>
        <button 
          onClick={() => navigator.vibrate?.(10)}
          className="h-10 w-10 flex items-center justify-center text-muted-foreground hover:bg-muted rounded-full transition"
        >
          <Bell className="h-5 w-5" />
        </button>
      </header>

      {/* ─── Hero Card: Saldo ─── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[24px] p-6 border border-border/60 shadow-card">
        
        {/* Saldo Total */}
        <div className="mb-6 relative">
          <p className="text-[13px] text-muted-foreground font-medium mb-1 flex justify-between items-center">
            Saldo Total
            <button 
              onClick={() => { setHidden(h => !h); navigator.vibrate?.(10); }} 
              className="text-muted-foreground hover:text-foreground p-1"
            >
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </p>
          <AnimatePresence mode="wait">
            <motion.p key={`${month}-${year}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="font-display text-[40px] font-extrabold tracking-tight text-foreground">
              {hidden ? "R$ ••••••" : formatBRL(balance)}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Receita / Despesa */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-success/5 rounded-2xl p-4 border border-success/10 transition-colors">
            <p className="text-[11px] text-success/80 font-bold uppercase tracking-wider mb-1">Ganhei</p>
            <p className="font-display font-bold text-lg text-success">{v(income)}</p>
          </div>
          <div className="bg-destructive/5 rounded-2xl p-4 border border-destructive/10 transition-colors">
            <p className="text-[11px] text-destructive/80 font-bold uppercase tracking-wider mb-1">Gastei</p>
            <p className="font-display font-bold text-lg text-destructive">{v(expense)}</p>
          </div>
        </div>
      </motion.div>

      {/* ─── Ações Rápidas ─── */}
      <div className="flex gap-3">
        <AddTransactionSheet trigger={
          <button 
            onClick={() => navigator.vibrate?.(10)}
            className="flex-1 flex items-center justify-center gap-2 h-14 gradient-primary text-primary-foreground rounded-2xl font-bold text-sm shadow-glow active:scale-95 transition-all"
          >
            <Plus className="h-5 w-5" /> Novo Lançamento
          </button>
        } />
      </div>

      {/* ─── Cards: Categorias de Gasto ─── */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="font-display text-[19px] font-bold text-foreground">Gastos p/ Categoria</h2>
          <Link to="/app/insights" className="text-[13px] text-primary font-bold">
            Ver Detalhes
          </Link>
        </div>
        
        {catSlices.length === 0 ? (
          <div className="glass rounded-[24px] p-8 text-center border border-border/60">
            <p className="text-muted-foreground text-sm">Sem gastos este mês.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {catSlices.slice(0, 4).map((cat, i) => (
              <CatCard key={cat.name} name={cat.name} value={cat.value} total={expense} color={cat.color} delay={i * 0.05} />
            ))}
          </div>
        )}
      </section>

      {/* ─── Transações Recentes ─── */}
      <section className="glass rounded-[24px] p-6 border border-border/60 shadow-card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-foreground">Recentes</h2>
          <Link to="/app/transactions" className="text-[13px] text-primary font-bold">Ver Tudo</Link>
        </div>
        
        <div className="space-y-4">
          {inMonth.slice(0, 3).map((t: any) => (
            <div key={t.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{t.description}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <p className={`text-sm font-bold tabular-nums shrink-0 ${t.type === 'income' ? 'text-success' : 'text-foreground'}`}>
                {t.type === 'income' ? '+' : '-'} {formatBRL(Math.abs(t.amount))}
              </p>
            </div>
          ))}
          {inMonth.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4 italic">Nenhuma atividade</p>
          )}
        </div>
      </section>

    </div>
  );
};

export default Dashboard;
