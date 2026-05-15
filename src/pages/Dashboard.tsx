import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  PiggyBank, Eye, EyeOff, Bell, Plus, ArrowLeftRight
} from "lucide-react";
import { useTransactions, useProfile, useCategories } from "@/hooks/useFinance";
import { formatBRL } from "@/lib/format";
import { AddTransactionSheet } from "@/components/dashboard/AddTransactionSheet";
import { QuickMessageInput } from "@/components/dashboard/QuickMessageInput";
import { Link } from "react-router-dom";

const CatCard = ({ name, value, total, color, delay }: any) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay }}
      className="glass border border-border/60 rounded-[24px] p-4 shadow-sm flex flex-col justify-between aspect-[1.1/1]">
      <div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-3">
          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay }}
            className="h-full rounded-full" style={{ backgroundColor: color }} />
        </div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{name}</p>
        <p className="text-[15px] font-bold text-foreground mt-1 tabular-nums">{formatBRL(value)}</p>
      </div>
      <p className="text-[10px] font-bold text-muted-foreground/60">{pct}% do total</p>
    </motion.div>
  );
};

const Dashboard = () => {
  const { data: profile } = useProfile();
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const [hidden, setHidden] = useState(false);

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const inMonth = useMemo(() => transactions.filter((t: any) => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  }), [transactions, month, year]);

  const { income, expense, balance } = useMemo(() => {
    let inc = 0, exp = 0;
    inMonth.forEach((t: any) => {
      if (t.type === 'income') inc += Number(t.amount);
      else exp += Math.abs(Number(t.amount));
    });
    return { income: inc, expense: exp, balance: inc - exp };
  }, [inMonth]);

  const catSlices = useMemo(() => {
    const map: Record<string, number> = {};
    inMonth.filter((t: any) => t.type === 'expense').forEach((t: any) => {
      const catName = categories.find(c => c.id === t.category_id)?.name || "Outros";
      map[catName] = (map[catName] || 0) + Math.abs(Number(t.amount));
    });
    return Object.entries(map)
      .map(([name, value]) => ({ 
        name, 
        value, 
        color: categories.find(c => c.name === name)?.color || "#cbd5e1" 
      }))
      .sort((a, b) => b.value - a.value);
  }, [inMonth, categories]);

  const v = (val: number) => hidden ? "R$ •••" : formatBRL(val);

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

      {/* ─── Oink AI: Entrada Mágica ─── */}
      <QuickMessageInput />

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

      {/* ─── Seção de Metas ─── */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="font-display text-[19px] font-bold text-foreground">Suas Metas</h2>
          <Link to="/app/goals" className="text-[13px] text-primary font-bold">Ver Metas</Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-5 px-5">
          <Link to="/app/goals" className="min-w-[140px] glass rounded-[24px] p-4 border border-dashed border-border/60 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center"><Plus className="h-5 w-5" /></div>
            <span className="text-[11px] font-bold uppercase">Nova Meta</span>
          </Link>
          {/* Implementação futura de cards de meta aqui se necessário */}
        </div>
      </section>

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