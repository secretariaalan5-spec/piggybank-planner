import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, CheckCircle2, ArrowRight, MessageSquare, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCategories, useAccounts, useAddTransaction } from "@/hooks/useFinance";
import { toast } from "sonner";

// Mapeamento de categorias do Gemini → IDs do banco
const CATEGORY_MAP: Record<string, string[]> = {
  alimentação:  ["alimentação", "alimentacao", "food", "comida"],
  transporte:   ["transporte", "uber", "taxi", "ônibus", "metro"],
  moradia:      ["moradia", "aluguel", "casa", "habitação"],
  saúde:        ["saúde", "saude", "farmácia", "farmacia", "médico", "medico"],
  lazer:        ["lazer", "entretenimento", "cinema", "viagem"],
  educação:     ["educação", "educacao", "curso", "escola"],
  vestuário:    ["vestuário", "vestuario", "roupa", "roupas"],
  assinaturas:  ["assinaturas", "streaming", "netflix", "spotify", "assinatura"],
  investimento: ["investimento", "investimentos", "poupança"],
  salário:      ["salário", "salario", "renda", "income"],
  outros:       ["outros", "other"],
};

interface ParsedResult {
  amount: number;
  type: "income" | "expense";
  description: string;
  category: string;
  date: string;
  rawText?: string;
}

const SUGGESTIONS = [
  "Gastei 50 no iFood",
  "Paguei 120 de uber essa semana",
  "Recebi 3.000 de salário",
  "Farmácia 35,90",
  "Netflix 55,90",
  "Mercado 280 ontem",
];

export const QuickMessageInput = () => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const addTx = useAddTransaction();

  const findCategoryId = (geminiCategory: string): string | undefined => {
    const lower = geminiCategory.toLowerCase().trim();
    for (const [key, aliases] of Object.entries(CATEGORY_MAP)) {
      if (aliases.some(a => lower.includes(a) || a.includes(lower))) {
        // Busca na lista real de categorias do banco
        const found = categories.find(
          c => c.name.toLowerCase().includes(key) || key.includes(c.name.toLowerCase())
        );
        if (found) return found.id;
      }
    }
    // Fallback: "Outros"
    return categories.find(c => c.name.toLowerCase().includes("outros"))?.id;
  };

  const handleParse = async () => {
    if (!message.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("parse-message", {
        body: { message: message.trim() },
      });

      if (error) throw new Error("Erro de conexão com o servidor de IA.");
      if (data?.error) throw new Error(data.error);

      setResult(data as ParsedResult);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível interpretar a mensagem.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);

    try {
      const categoryId = findCategoryId(result.category);
      const accountId = accounts[0]?.id; // Usa a primeira conta como padrão

      if (!accountId) {
        toast.error("Crie uma conta primeiro antes de salvar lançamentos.");
        return;
      }

      await addTx.mutateAsync({
        amount: result.amount,
        type: result.type,
        description: result.description,
        category_id: categoryId,
        account_id: accountId,
        date: result.date,
      });

      toast.success(`✅ "${result.description}" salvo! R$ ${result.amount.toFixed(2)}`);
      setMessage("");
      setResult(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && message.trim() && !loading) {
      e.preventDefault();
      handleParse();
    }
  };

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="glass border border-border/60 rounded-3xl p-5 shadow-card space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl gradient-primary flex items-center justify-center shadow-glow shrink-0">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <p className="font-display font-bold text-sm">Registrar por texto</p>
          <p className="text-xs text-muted-foreground">Descreva o gasto em linguagem natural</p>
        </div>
      </div>

      {/* Input de mensagem */}
      <div className="relative">
        <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Ex: "Gastei 50 no iFood" ou "Paguei 120 de uber"'
          rows={2}
          className="w-full pl-9 pr-4 py-2.5 bg-muted/50 border border-border/60 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Sugestões rápidas */}
      {!result && (
        <div className="flex gap-2 flex-wrap">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => setMessage(s)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-muted/60 border border-border/40 text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Botão de analisar */}
      <Button
        onClick={handleParse}
        disabled={!message.trim() || loading}
        className="w-full h-11 rounded-2xl gradient-primary text-primary-foreground font-semibold shadow-glow"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analisando com IA...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Analisar mensagem
          </>
        )}
      </Button>

      {/* Resultado da IA */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="border border-primary/30 bg-primary/5 rounded-2xl p-4 space-y-3"
          >
            <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              IA identificou:
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card/60 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Valor</p>
                <p className={`font-display font-bold text-base ${result.type === "expense" ? "text-destructive" : "text-success"}`}>
                  {result.type === "expense" ? "-" : "+"}{formatBRL(result.amount)}
                </p>
              </div>
              <div className="bg-card/60 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Tipo</p>
                <p className="font-semibold text-sm capitalize">
                  {result.type === "expense" ? "💸 Despesa" : "💰 Receita"}
                </p>
              </div>
              <div className="bg-card/60 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Descrição</p>
                <p className="font-semibold text-sm truncate">{result.description}</p>
              </div>
              <div className="bg-card/60 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold mb-0.5">Categoria</p>
                <p className="font-semibold text-sm truncate">{result.category}</p>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              📅 {new Date(result.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setResult(null)}
                className="flex-1 rounded-xl border-border/60"
              >
                <Edit3 className="mr-1.5 h-3.5 w-3.5" />
                Corrigir
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl gradient-primary text-primary-foreground shadow-glow"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Salvar
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
