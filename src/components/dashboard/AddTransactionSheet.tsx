import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Camera, Sparkles } from "lucide-react";
import { useCategories, useAccounts, useAddTransaction } from "@/hooks/useFinance";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  amount: z.number().positive("Valor deve ser positivo").max(10_000_000),
  description: z.string().trim().max(120).optional(),
  category_id: z.string().uuid("Selecione uma categoria"),
  account_id: z.string().uuid("Selecione uma conta"),
  type: z.enum(["income", "expense"]),
  date: z.string(),
  installment_total: z.number().int().min(1).max(72).optional(),
});

export const AddTransactionSheet = ({ trigger }: { trigger?: React.ReactNode }) => {
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const addTx = useAddTransaction();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [installments, setInstallments] = useState("1");
  
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCategories = categories.filter(c => c.type === type);

  // Set default account if not selected and accounts exist
  if (!accountId && accounts.length > 0) {
    setAccountId(accounts[0].id);
  }

  // Set default category if not selected to avoid save errors
  if (!categoryId && filteredCategories.length > 0) {
    setCategoryId(filteredCategories[0].id);
  }

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    toast.info("Lendo cupom fiscal...", { icon: <Sparkles className="h-4 w-4 text-primary" /> });

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(",")[1];
          
          const { data, error } = await supabase.functions.invoke('process-receipt', {
            body: { imageBase64: base64, mimeType: file.type }
          });

          if (error) throw new Error("Erro de conexão com o servidor de IA.");
          if (data?.error) throw new Error(data.error);

          // Preenche os campos magicamente
          if (data.amount) setAmount(data.amount.toString().replace('.', ','));
          if (data.description) setDescription(data.description);
          if (data.date) setDate(data.date);
          
          toast.success("Recibo preenchido com sucesso!");
        } catch (err: any) {
          toast.error(err.message || "Não foi possível ler este recibo.");
        } finally {
          setScanning(false);
          // Limpa o input para poder escanear a mesma foto se quiser testar de novo
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
    } catch (err: any) {
      setScanning(false);
      toast.error("Erro ao acessar a câmera.");
    }
  };

  const submit = async () => {
    const parsed = schema.safeParse({
      amount: parseFloat(amount.replace(",", ".")),
      description,
      category_id: categoryId,
      account_id: accountId,
      type,
      date,
      installment_total: parseInt(installments || "1"),
    });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }

    await addTx.mutateAsync(parsed.data);
    setOpen(false);
    setAmount(""); setDescription(""); setCategoryId(""); setInstallments("1");
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
          <SheetTitle className="font-display text-2xl flex justify-between items-center pr-6">
            <span>Novo lançamento</span>
            
            {/* Botão de Câmera Nativa */}
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleScanReceipt} 
            />
            <Button 
              size="sm" 
              variant="outline" 
              className="rounded-full gap-2 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
            >
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              <span className="text-xs">{scanning ? "Lendo..." : "Escanear"}</span>
            </Button>
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-2xl">
            {(["expense", "income"] as const).map(t => (
              <button
                key={t}
                onClick={() => { setType(t); setCategoryId(""); }}
                className={`py-2.5 rounded-xl text-sm font-semibold transition ${type === t ? "bg-card shadow-card text-foreground" : "text-muted-foreground"}`}
              >
                {t === "expense" ? "Gastei" : "Ganhei"}
              </button>
            ))}
          </div>

          <div>
            <Label>Valor {parseInt(installments) > 1 && "(da parcela)"}</Label>
            <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" inputMode="decimal" className="mt-1.5 h-14 rounded-xl text-2xl font-display font-bold tabular-nums" />
          </div>

          <div>
            <Label>Descrição (opcional)</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Mercado da semana" className="mt-1.5 h-12 rounded-xl" maxLength={120} />
          </div>

          <div>
            <Label>Conta</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-2 max-h-32 overflow-y-auto scrollbar-hide">
              {accounts.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAccountId(a.id)}
                  className={`p-3 rounded-2xl border text-xs font-medium transition ${accountId === a.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground"}`}
                >
                  <span className="block truncate">{a.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Categoria</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-hide">
              {filteredCategories.map(c => (
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1.5 h-12 rounded-xl" />
            </div>
            {type === "expense" && (
              <div>
                <Label>Parcelas</Label>
                <Input type="number" min="1" max="72" value={installments} onChange={e => setInstallments(e.target.value)} className="mt-1.5 h-12 rounded-xl" />
              </div>
            )}
          </div>

          <Button onClick={submit} disabled={addTx.isPending || scanning} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow">
            {addTx.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar lançamento"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};