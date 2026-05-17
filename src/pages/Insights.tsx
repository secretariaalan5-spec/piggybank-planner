import { useMemo } from "react";
import { useInsights, useTransactions } from "@/hooks/useFinance";
import { PiggyMascot } from "@/components/PiggyMascot";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { formatBRL } from "@/lib/format";

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

const Insights = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: insights = [] } = useInsights();
  const { data: transactions = [] } = useTransactions();

  // Calcula os dados do mês atual
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTx = transactions.filter((t: any) => {
      // Ajuste de timezone simples para garantir o mês correto
      const d = new Date(t.date + 'T12:00:00'); 
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const income = monthTx.filter((t: any) => t.type === "income").reduce((acc: number, t: any) => acc + Number(t.amount), 0);
    const expenses = monthTx.filter((t: any) => t.type === "expense").reduce((acc: number, t: any) => acc + Number(t.amount), 0);
    
    // Percentual do salário gasto
    const spentPercent = income > 0 ? Math.min(Math.round((expenses / income) * 100), 100) : (expenses > 0 ? 100 : 0);
    const overspent = income > 0 && expenses > income;

    // Agrupa por categoria com paleta rica
    const byCategory = new Map<string, { total: number, color: string }>();
    monthTx.filter((t: any) => t.type === "expense").forEach((t: any) => {
      const name = t.categories?.name || "Outros";
      const fallbackColor = CAT_COLORS[name.toLowerCase()] || PALETTE[byCategory.size % PALETTE.length];
      const color = t.categories?.color || fallbackColor;
      const current = byCategory.get(name) || { total: 0, color };
      byCategory.set(name, { total: current.total + Number(t.amount), color });
    });

    const topCategories = Array.from(byCategory.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 3); // Pega os 3 maiores gastos

    return { income, expenses, spentPercent, overspent, topCategories };
  }, [transactions]);

  // Gera o conselho dinâmico
  const aiAdvice = useMemo(() => {
    if (stats.income === 0 && stats.expenses === 0) return "Adicione seus lançamentos (receitas e despesas) deste mês para eu poder analisar sua saúde financeira.";
    if (stats.overspent) return "Alerta vermelho! 🚨 Você já gastou mais do que ganhou neste mês. Freie os gastos não essenciais imediatamente.";
    if (stats.spentPercent > 80) return `Atenção! Você já gastou ${stats.spentPercent}% da sua renda. Evite novas compras no cartão até o mês virar.`;
    if (stats.spentPercent > 50) return `Você consumiu ${stats.spentPercent}% do orçamento. Seus maiores vilões estão na lista abaixo.`;
    return `Parabéns! Você gastou apenas ${stats.spentPercent}% da sua renda até agora. Excelente momento para investir a diferença.`;
  }, [stats]);

  const markRead = async (id: string) => {
    await supabase.from("ai_insights").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["insights"] });
  };

  return (
    <div className="px-5 pt-6 pb-10 space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Análise Inteligente</h1>
        <p className="text-sm text-muted-foreground">Resumo do seu mês até agora</p>
      </header>

      {/* Cartão de Saúde Financeira */}
      <div className="relative glass border border-border/60 rounded-3xl p-5 shadow-card overflow-hidden">
        <div className="absolute -right-4 top-2 opacity-90 pointer-events-none drop-shadow-2xl">
          <PiggyMascot size={110} />
        </div>
        
        <div className="relative pr-24">
          <div className="flex items-center gap-2 mb-4">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${stats.overspent ? 'bg-destructive/20 text-destructive' : stats.spentPercent > 80 ? 'bg-amber-500/20 text-amber-500' : 'bg-success/20 text-success'}`}>
              {stats.overspent ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saúde do Mês</p>
              <p className="font-display font-bold text-lg">
                {stats.spentPercent}% da renda
              </p>
            </div>
          </div>

          <p className="text-sm font-medium leading-relaxed text-balance">
            {aiAdvice}
          </p>
        </div>

        {/* Barra de progresso do salário */}
        <div className="mt-5 relative h-2.5 w-full bg-muted rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${stats.spentPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`absolute top-0 left-0 h-full rounded-full ${stats.overspent ? 'bg-destructive' : stats.spentPercent > 80 ? 'bg-amber-500' : 'gradient-primary'}`}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] font-semibold text-muted-foreground uppercase">
          <span>0%</span>
          <span>{formatBRL(stats.expenses)} gastos</span>
        </div>
      </div>

      {/* Maiores Gastos (Ranking) */}
      {stats.topCategories.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-display font-semibold px-1">Onde seu dinheiro foi parar</h3>
          <div className="glass border border-border/60 rounded-3xl p-4 shadow-card space-y-4">
            {stats.topCategories.map(([name, data], i) => (
              <div key={name} className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }}></span>
                    {name}
                  </p>
                  <p className="font-display font-bold text-sm tabular-nums text-destructive">
                    {formatBRL(data.total)}
                  </p>
                </div>
                {/* Minibarra de categoria */}
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((data.total / stats.expenses) * 100, 100)}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: data.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Dicas Antigas (Base de dados) */}
      {insights.length > 0 && (
        <section className="space-y-3 pt-2">
          <h3 className="font-display font-semibold px-1">Dicas Extras</h3>
          <div className="space-y-3">
            {insights.filter((i: any) => !i.is_read).map((ins: any, i: number) => (
              <motion.button
                key={ins.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => markRead(ins.id)}
                className="w-full text-left glass border border-primary/30 rounded-3xl p-5 shadow-card transition"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center shadow-glow shrink-0">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold">{ins.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{ins.content}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Insights;
