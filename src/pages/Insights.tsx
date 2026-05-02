import { useEffect, useMemo } from "react";
import { useInsights, useTransactions } from "@/hooks/useFinance";
import { PiggyMascot } from "@/components/PiggyMascot";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";

const TIPS = [
  { title: "A regra 50/30/20", content: "Tente dividir sua renda em 50% essenciais, 30% lazer e 20% poupança. Comece pelos 20% — pague-se primeiro!", type: "tip" },
  { title: "Pequenos vazamentos afundam navios", content: "Aquele cafezinho diário pode virar R$ 200/mês. Sem cortar o prazer, troque um por dois na semana.", type: "tip" },
  { title: "Categoria mais cara revelada", content: "Olhe seu gráfico de gastos. A maior fatia geralmente esconde a maior oportunidade de economia.", type: "alert" },
  { title: "Meta clara, foco real", content: "Sem meta financeira, todo dinheiro vira gasto. Crie ao menos uma — começar pequeno conta.", type: "tip" },
  { title: "Automatize o bem", content: "Configure transferências automáticas para sua poupança no dia do salário. Você não vai sentir falta.", type: "tip" },
  { title: "Compras por impulso?", content: "Use a regra das 24h: queira por um dia inteiro antes de comprar. 70% das vezes você desiste.", type: "tip" },
  { title: "Renegocie tudo", content: "Internet, plano de celular, streaming. Uma ligação por ano pode te economizar centenas.", type: "tip" },
];

const Insights = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: insights = [] } = useInsights();
  const { data: transactions = [] } = useTransactions();

  // Bootstrap: cria 3 dicas iniciais se não houver nenhuma
  useEffect(() => {
    if (!user || insights.length > 0) return;
    const seed = TIPS.slice(0, 3).map(t => ({ ...t, user_id: user.id, insight_type: t.type }));
    supabase.from("ai_insights").insert(seed).then(() => qc.invalidateQueries({ queryKey: ["insights"] }));
  }, [user, insights.length, qc]);

  const personalized = useMemo(() => {
    if (transactions.length === 0) return null;
    const expenses = transactions.filter((t: any) => t.type === "expense");
    if (expenses.length === 0) return null;
    const byCat = new Map<string, number>();
    expenses.forEach((t: any) => {
      const k = t.categories?.name || "Outros";
      byCat.set(k, (byCat.get(k) || 0) + Number(t.amount));
    });
    const top = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1])[0];
    return top ? `Sua categoria com mais gastos é "${top[0]}". Que tal definir um teto mensal para ela?` : null;
  }, [transactions]);

  const generateNew = async () => {
    if (!user) return;
    const random = TIPS[Math.floor(Math.random() * TIPS.length)];
    const { error } = await supabase.from("ai_insights").insert({
      user_id: user.id,
      title: random.title,
      content: personalized || random.content,
      insight_type: random.type,
    });
    if (error) toast.error(error.message);
    else { toast.success("Nova dica chegou!"); qc.invalidateQueries({ queryKey: ["insights"] }); }
  };

  const markRead = async (id: string) => {
    await supabase.from("ai_insights").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["insights"] });
  };

  return (
    <div className="px-5 pt-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Pigly IA</h1>
          <p className="text-sm text-muted-foreground">Conselhos do seu porquinho</p>
        </div>
        <Button onClick={generateNew} variant="outline" size="sm" className="rounded-full">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Nova dica
        </Button>
      </header>

      <div className="relative glass border border-border/60 rounded-3xl p-5 shadow-card overflow-hidden">
        <div className="absolute -right-6 -bottom-6 opacity-90"><PiggyMascot size={140} /></div>
        <div className="relative pr-28">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
            <Sparkles className="h-3 w-3" /> Análise rápida
          </div>
          <p className="font-display font-semibold mt-3 text-balance leading-snug">
            {personalized || "Adicione lançamentos para receber análises personalizadas. Começamos com as melhores práticas para você!"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {insights.map((ins: any, i: number) => (
          <motion.button
            key={ins.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => markRead(ins.id)}
            className={`w-full text-left glass border rounded-3xl p-5 shadow-card transition ${ins.is_read ? "border-border/40 opacity-80" : "border-primary/30"}`}
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
    </div>
  );
};

export default Insights;
