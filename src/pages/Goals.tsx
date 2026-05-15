import { useState } from "react";
import { useGoals } from "@/hooks/useFinance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus, Target, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatBRL, formatLongDate } from "@/lib/format";
import { z } from "zod";
import { motion } from "framer-motion";

const schema = z.object({
  title: z.string().trim().min(2).max(60),
  target_amount: z.number().positive().max(100_000_000),
  current_amount: z.number().min(0).max(100_000_000),
  deadline: z.string().optional().nullable(),
});

const Goals = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: goals = [] } = useGoals();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", target: "", current: "", deadline: "" });

  const submit = async () => {
    const parsed = schema.safeParse({
      title: form.title,
      target_amount: parseFloat(form.target.replace(",", ".")),
      current_amount: parseFloat((form.current || "0").replace(",", ".")),
      deadline: form.deadline || null,
    });
    if (!parsed.success) { toast.error("Verifique os campos da meta"); return; }
    setLoading(true);
    const { error } = await supabase.from("goals").insert({
      user_id: user!.id,
      title: parsed.data.title,
      target_amount: parsed.data.target_amount,
      current_amount: parsed.data.current_amount,
      deadline: parsed.data.deadline ?? null,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    navigator.vibrate?.(10);
    toast.success("Meta criada!");
    qc.invalidateQueries({ queryKey: ["goals"] });
    setOpen(false);
    setForm({ title: "", target: "", current: "", deadline: "" });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("goals").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { 
      navigator.vibrate?.(10);
      toast.success("Meta removida"); 
      qc.invalidateQueries({ queryKey: ["goals"] }); 
    }
  };

  return (
    <div className="px-5 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold tracking-tight">Metas</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="rounded-full gradient-primary text-primary-foreground shadow-glow">
              <Plus className="h-4 w-4 mr-1" /> Nova
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl border-border/60">
            <SheetHeader><SheetTitle className="font-display text-2xl">Nova meta</SheetTitle></SheetHeader>
            <div className="mt-6 space-y-4">
              <div><Label>Título</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Viagem para o Japão" className="mt-1.5 h-12 rounded-xl" maxLength={60} /></div>
              <div><Label>Valor alvo</Label><Input value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} placeholder="0,00" inputMode="decimal" className="mt-1.5 h-12 rounded-xl" /></div>
              <div><Label>Já guardado (opcional)</Label><Input value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} placeholder="0,00" inputMode="decimal" className="mt-1.5 h-12 rounded-xl" /></div>
              <div><Label>Prazo (opcional)</Label><Input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="mt-1.5 h-12 rounded-xl" /></div>
              <Button onClick={submit} disabled={loading} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar meta"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-20 glass border border-border/60 rounded-3xl">
          <Target className="h-12 w-12 text-primary mx-auto mb-3" />
          <p className="font-display font-semibold">Nenhuma meta ainda</p>
          <p className="text-sm text-muted-foreground mt-1 px-6">Defina objetivos claros e acompanhe seu progresso.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((g: any, i: number) => {
            const pct = Math.min(100, Math.round((Number(g.current_amount) / Number(g.target_amount)) * 100) || 0);
            return (
              <motion.div key={g.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass border border-border/60 rounded-3xl p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold truncate">{g.title}</h3>
                    {g.deadline && <p className="text-xs text-muted-foreground mt-0.5">Até {formatLongDate(g.deadline)}</p>}
                  </div>
                  <button onClick={() => remove(g.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition" aria-label="Remover meta"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="font-display font-bold text-lg tabular-nums">{formatBRL(Number(g.current_amount))}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">de {formatBRL(Number(g.target_amount))}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full gradient-primary rounded-full" />
                  </div>
                  <p className="text-xs text-primary font-semibold mt-2 tabular-nums">{pct}% concluído</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Goals;