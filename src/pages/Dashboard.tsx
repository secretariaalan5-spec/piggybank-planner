import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTransactions, useProfile, useAccounts, useInsights } from "@/hooks/useFinance";
import { AddTransactionSheet } from "@/components/dashboard/AddTransactionSheet";
import { QuickMessageInput } from "@/components/dashboard/QuickMessageInput";
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
  saúde: Zap, assinaturas: Zap, outros: ShoppingCart,
};

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
      className="bg-white rounded-[20px] p-4 border border-slate-100 shadow-sm flex flex-col gap-3"
    >
      <div className="h-11 w-11 rounded-full flex items-center justify-center mb-1" style={{ background: color + "22" }}>
        <Icon className="h-5 w-5" style={{ color }} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[13px] text-muted-foreground font-medium truncate mb-1">{name}</p>
        <p className="font-display font-bold text-[22px] tracking-tight text-slate-800">{formatBRL(value)}</p>
      </div>
      <div className="mt-2">
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: delay + 0.2, duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: isCritical ? "#ff4d4f" : color }}
          />
        </div>
        <p className={`text-[11px] font-medium ${isCritical ? 'text-red-500' : 'text-slate-400'}`}>
          {isCritical ? "Nível crítico" : `${pct}% do total`}
        </p>
      </div>
    </motion.div>
  );
};

// ── Dashboard ──────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year,  setYear]  = useState(now.getFullYear());
  const [hidden, setHidden]  = useState(false);

  const { data: profile }           = useProfile();
  const { data: transactions = [] } = useTransactions();

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

  const v = (n: number) => hidden ? "R$ ••••" : formatBRL(n);

  return (
    <div className="px-5 pt-6 pb-32 space-y-8 bg-slate-50 min-h-screen">

      {/* ─── Header ─── */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden border border-emerald-200">
            <PiggyBank className="h-6 w-6 text-emerald-600" />
          </div>
          <h1 className="font-display text-xl font-bold text-emerald-800">
            Olá, {profile?.display_name?.split(' ')[0] || "Economizador"}!
          </h1>
        </div>
        <button className="h-10 w-10 flex items-center justify-center text-emerald-800 hover:bg-emerald-100 rounded-full transition">
          <Bell className="h-5 w-5" />
        </button>
      </header>

      {/* ─── Hero Card: Saldo ─── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
        
        {/* Saldo Total */}
        <div className="mb-6 relative">
          <p className="text-[13px] text-slate-500 font-medium mb-1 flex justify-between items-center">
            Saldo Total
            <button onClick={() => setHidden(h => !h)} className="text-slate-400 hover:text-slate-600">
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </p>
          <AnimatePresence mode="wait">
            <motion.p key={`${month}-${year}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="font-display text-[40px] font-extrabold tracking-tight text-slate-900">
              {hidden ? "R$ ••••••" : formatBRL(balance)}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Receita / Despesa */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100/50">
            <p className="text-[12px] text-emerald-700/80 font-medium mb-1">Renda Mensal</p>
            <p className="font-display font-bold text-lg text-emerald-800">{v(income)}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-3 border border-rose-100/50">
            <p className="text-[12px] text-rose-700/80 font-medium mb-1">Gasto Mensal</p>
            <p className="font-display font-bold text-lg text-rose-800">{v(expense)}</p>
          </div>
        </div>
      </motion.div>

      {/* ─── Resumo Simples ─── */}
      {balance > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-emerald-50 rounded-[20px] p-5 border border-emerald-100 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[13px] text-emerald-800 font-bold mb-0.5">Ótimo trabalho!</p>
            <p className="text-xs text-emerald-700/80 leading-relaxed">
              Você já economizou <span className="font-bold">{formatBRL(balance)}</span> este mês. Continue assim!
            </p>
          </div>
        </motion.div>
      )}

      {/* ─── Ações Rápidas ─── */}
      <div className="flex gap-3">
        <AddTransactionSheet trigger={
          <button className="flex-1 flex items-center justify-center gap-2 h-12 bg-slate-900 text-white rounded-[20px] font-medium text-sm shadow-md active:scale-95 transition-all">
            <Plus className="h-4 w-4" /> Novo
          </button>
        } />
        <Link to="/app/transactions" className="flex-1 flex items-center justify-center gap-2 h-12 bg-white text-slate-700 border border-slate-200 rounded-[20px] font-medium text-sm shadow-sm active:scale-95 transition-all">
           Ver todas
        </Link>
      </div>

      {/* ─── Cards: Categorias de Gasto ─── */}
      <section>
        <div className="flex items-center justify-between mb-5 px-1">
          <h2 className="font-display text-[19px] font-bold text-slate-800">Gastos por Categoria</h2>
          <Link to="/app/insights" className="text-[13px] text-emerald-600 font-bold hover:text-emerald-700">
            Ver Tudo
          </Link>
        </div>
        
        {catSlices.length === 0 ? (
          <div className="bg-white rounded-[20px] p-8 text-center shadow-sm border border-slate-100">
            <PiggyBank className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Nenhum gasto registrado este mês.</p>
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
      <section className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-slate-800">Últimas Atividades</h2>
          <Link to="/app/transactions" className="text-[13px] text-emerald-600 font-bold">
            Ver Mais
          </Link>
        </div>
        
        <div className="space-y-4">
          {inMonth.slice(0, 3).map((t: any) => (
            <div key={t.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-700">{t.description?.split(' (')[0]}</p>
                    {t.installment_total > 1 && (
                      <span className="text-[9px] font-bold px-1 bg-slate-100 text-slate-500 rounded uppercase">
                        {t.installment_current}/{t.installment_total}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <p className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-700'}`}>
                {t.type === 'income' ? '+' : '-'} {formatBRL(Math.abs(t.amount))}
              </p>
            </div>
          ))}
          {inMonth.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-4">Sem atividades recentes</p>
          )}
        </div>
      </section>

    </div>
  );
};

export default Dashboard;