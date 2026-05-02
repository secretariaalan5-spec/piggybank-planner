import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import { useCategories } from "@/hooks/useFinance";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  amount: z.number().positive("Valor deve ser positivo").max(10_000_000),
  description: z.string().trim().max(120).optional(),
  category_id: z.string().uuid("Selecione uma categoria"),
  type: z.enum(["income", "expense"]),
  date: z.string(),
});

export const AddTransactionSheet = ({ trigger }: { trigger?: React.ReactNode }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: categories = [] } = useCategories();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const filtered = categories.filter(c => c.type === type);

  const submit = async () => {
    const parsed = schema.safeParse({
      amount: parseFloat(amount.replace(",", ".")),
      description,
      category_id: categoryId,
      type,
      date,
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    const { error } = await supabase.from("transactions").insert({
      user_id: user!.id,
      amount: parsed.data.amount,
      description: parsed.data.description || null,
      category_id: parsed.data.category_id,
      type: parsed.data.type,
      date: parsed.data.date,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Lançamento salvo!");
    qc.invalidateQueries({ queryKey: ["transactions"] });
    setOpen(false);
    setAmount(""); setDescription(""); setCategoryId("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="rounded-full h-14 w-14 p-0 gradient-primary text-primary-foreground shadow-glow">
            <Plus className="h-6 w-6" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto border-border/60">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Novo lançamento</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-2xl">
            {(["expense", "income"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setType(t); setCategoryId(""); }}
                className={`py-2.5 rounded-xl text-sm font-semibold transition ${type === t ? "bg-card shadow-card text-foreground" : "text-muted-foreground"}`}
              >
                {t === "expense" ? "Despesa" : "Receita"}
              </button>
            ))}
          </div>

          <div>
            <Label>Valor</Label>
            <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" className="mt-1.5 h-14 rounded-xl text-2xl font-display font-bold tabular-nums" />
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Mercado da semana" className="mt-1.5 h-12 rounded-xl" maxLength={120} />
          </div>

          <div>
            <Label>Categoria</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-hide">
              {filtered.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`p-3 rounded-2xl border text-xs font-medium transition ${categoryId === c.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground"}`}
                >
                  <span className="block truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Data</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1.5 h-12 rounded-xl" />
          </div>

          <Button onClick={submit} disabled={loading} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar lançamento"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
