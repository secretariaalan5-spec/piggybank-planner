import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Camera, Sparkles, CreditCard, Landmark, QrCode, Banknote } from "lucide-react";
import { useCategories, useAccounts, useAddTransaction } from "@/hooks/useFinance";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

// ── Tipos de pagamento ────────────────────────────────────────
type PaymentMethod = "credito" | "debito" | "pix" | "dinheiro";

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
  accountTypes: string[]; // tipos de conta relacionados
}[] = [
  {
    id: "credito",
    label: "Crédito",
    shortLabel: "Crédito",
    icon: CreditCard,
    color: "#8b5cf6",
    accountTypes: ["credit"],
  },
  {
    id: "debito",
    label: "Débito",
    shortLabel: "Débito",
    icon: Landmark,
    color: "#3b82f6",
    accountTypes: ["checking", "savings"],
  },
  {
    id: "pix",
    label: "Pix",
    shortLabel: "Pix",
    icon: QrCode,
    color: "#10b981",
    accountTypes: ["checking", "savings"],
  },
  {
    id: "dinheiro",
    label: "Dinheiro",
    shortLabel: "Espécie",
    icon: Banknote,
    color: "#f59e0b",
    accountTypes: ["cash"],
  },
];

// ── Schema de validação ───────────────────────────────────────
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
  const qc = useQueryClient();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const addTx = useAddTransaction();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("debito");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [installments, setInstallments] = useState("1");
  const [notes, setNotes] = useState("");
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCategories = categories.filter(c => c.type === type);

  // Filtra contas baseado no método de pagamento selecionado
  const selectedMethodInfo = PAYMENT_METHODS.find(m => m.id === paymentMethod);
  const filteredAccounts = type === "income"
    ? accounts
    : accounts.filter(a => selectedMethodInfo?.accountTypes.includes(a.type) ?? true);

  // Se não houver contas filtradas, mostra todas
  const displayAccounts = filteredAccounts.length > 0 ? filteredAccounts : accounts;

  // Quando método de pagamento muda, auto-selecionar a conta mais adequada
  useEffect(() => {
    if (type === "income") return;
    const best = filteredAccounts[0];
    if (best) setAccountId(best.id);
  }, [paymentMethod, type]); // eslint-disable-line react-hooks/exhaustive-deps

  // Se for crédito, parcelas faz sentido; se não, reseta para 1
  useEffect(() => {
    if (paymentMethod !== "credito") setInstallments("1");
  }, [paymentMethod]);

  // Auto-injetar categorias faltantes para usuários antigos
  useEffect(() => {
    const checkAndInjectCategories = async () => {
      if (categories.length === 0) return;
      const hasCuidados = categories.some(c => c.name.toLowerCase() === "cuidados pessoais");
      const hasOutros = categories.some(c => c.name.toLowerCase() === "outros");
      if (hasCuidados && hasOutros) return;
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;
        const missing = [];
        if (!hasCuidados) missing.push({ user_id: userData.user.id, name: "Cuidados Pessoais", icon: "Scissors", color: "#ec4899", type: "expense" });
        if (!hasOutros) missing.push({ user_id: userData.user.id, name: "Outros", icon: "MoreHorizontal", color: "#64748b", type: "expense" });
        if (missing.length > 0) {
          const { error } = await supabase.from("categories").insert(missing);
          if (!error) qc.invalidateQueries({ queryKey: ["categories"] });
        }
      } catch { /* silent */ }
    };
    checkAndInjectCategories();
  }, [categories, qc]);

  // Defaults de conta e categoria
  if (!accountId && displayAccounts.length > 0) setAccountId(displayAccounts[0].id);
  if (!categoryId && filteredCategories.length > 0) setCategoryId(filteredCategories[0].id);

  // ── Escaneamento de recibo ──────────────────────────────────
  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    toast.info("Lendo cupom fiscal...", { icon: <Sparkles className="h-4 w-4 text-primary" /> });
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = async () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement("canvas");
        const MAX = 1500;
        let w = img.width, h = img.height;
        if (w > h ? w > MAX : h > MAX) { const r = MAX / Math.max(w, h); w *= r; h *= r; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
        try {
          const { data, error } = await supabase.functions.invoke("process-receipt", {
            body: { imageBase64: base64, mimeType: "image/jpeg" },
          });
          if (error) throw new Error("Erro de conexão com o servidor de IA.");
          if (data?.error) throw new Error(data.error);
          if (data.amount) setAmount(data.amount.toString().replace(".", ","));
          if (data.description) setDescription(data.description);
          if (data.date) setDate(data.date);
          if (data.category) {
            const found = filteredCategories.find(c =>
              c.name.toLowerCase().includes(data.category.toLowerCase()) ||
              data.category.toLowerCase().includes(c.name.toLowerCase())
            ) ?? filteredCategories.find(c => ["supermercado","cuidados pessoais","compras","outros"].some(k => c.name.toLowerCase().includes(k)));
            if (found) setCategoryId(found.id);
          }
          if (data.items?.length > 0) {
            setNotes(`Itens do Cupom Fiscal:\n${data.items.map((i: any) => `• ${i.name}: R$ ${Number(i.price || 0).toFixed(2)} (${i.category || "Geral"})`).join("\n")}`);
          }
          toast.success("Recibo preenchido com sucesso!");
        } catch (err: any) {
          toast.error(err.message || "Não foi possível ler este recibo.");
        } finally {
          setScanning(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };
      img.src = objectUrl;
    } catch {
      setScanning(false);
      toast.error("Erro ao acessar a câmera.");
    }
  };

  // ── Submissão ────────────────────────────────────────────────
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

    await addTx.mutateAsync({
      ...parsed.data,
      notes: notes || undefined,
      metodo_pagamento: type === "expense" ? paymentMethod : undefined,
    });
    setOpen(false);
    setAmount(""); setDescription(""); setCategoryId(""); setInstallments("1"); setNotes("");
  };

  const isCredit = paymentMethod === "credito";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="rounded-full h-14 w-14 p-0 gradient-primary text-primary-foreground shadow-glow">
            <Plus className="h-6 w-6" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[93vh] overflow-y-auto border-border/60">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl flex justify-between items-center pr-6">
            <span>Novo lançamento</span>
            {/* Câmera */}
            <input type="file" accept="image/*" capture="environment" ref={fileInputRef} className="hidden" onChange={handleScanReceipt} />
            <Button size="sm" variant="outline"
              className="rounded-full gap-2 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all"
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
            >
              {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              <span className="text-xs">{scanning ? "Lendo..." : "Escanear"}</span>
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {/* ── Gastei / Ganhei ── */}
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

          {/* ── Forma de Pagamento (só para despesas) ── */}
          <AnimatePresence>
            {type === "expense" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
                  Forma de Pagamento
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map(({ id, shortLabel, icon: Icon, color }) => {
                    const isSelected = paymentMethod === id;
                    return (
                      <button
                        key={id}
                        onClick={() => { setPaymentMethod(id); navigator.vibrate?.(5); }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-[11px] font-semibold transition-all ${
                          isSelected
                            ? "border-transparent text-white shadow-lg scale-[1.03]"
                            : "border-border/60 bg-card text-muted-foreground hover:border-primary/30"
                        }`}
                        style={isSelected ? { background: color, boxShadow: `0 4px 14px ${color}55` } : {}}
                      >
                        <Icon className="h-5 w-5" style={isSelected ? { color: "white" } : { color }} />
                        {shortLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Badge informativo para crédito */}
                <AnimatePresence>
                  {isCredit && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="mt-2 text-[11px] text-purple-400 font-medium flex items-center gap-1"
                    >
                      <CreditCard className="h-3 w-3" />
                      Compra no crédito — você pode parcelar abaixo
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Valor ── */}
          <div>
            <Label>
              Valor{isCredit && parseInt(installments) > 1 ? ` (por parcela)` : ""}
            </Label>
            <Input
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
              className="mt-1.5 h-14 rounded-xl text-2xl font-display font-bold tabular-nums"
            />
          </div>

          {/* ── Descrição ── */}
          <div>
            <Label>Descrição (opcional)</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Ex: Mercado da semana" className="mt-1.5 h-12 rounded-xl" maxLength={120} />
          </div>

          {/* ── Notas IA ── */}
          <div>
            <Label className="flex items-center gap-1.5 text-primary">
              <Sparkles className="w-3.5 h-3.5" /> Notas da IA (Itens)
            </Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Itens escaneados ou observações da compra..." className="mt-1.5 min-h-[70px] rounded-xl text-sm" />
          </div>

          {/* ── Conta ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label>Conta</Label>
              {type === "expense" && filteredAccounts.length === 0 && (
                <span className="text-[11px] text-amber-500">Sem conta compatível — mostrando todas</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto scrollbar-hide">
              {displayAccounts.map(a => {
                const isSelected = accountId === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => setAccountId(a.id)}
                    className={`p-3 rounded-2xl border text-xs font-medium transition-all flex items-center gap-2 ${
                      isSelected ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: a.color }}
                    />
                    <span className="truncate">{a.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Categoria ── */}
          <div>
            <Label>Categoria</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-2 max-h-48 overflow-y-auto scrollbar-hide">
              {filteredCategories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  className={`p-3 rounded-2xl border text-xs font-medium transition ${
                    categoryId === c.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  <span className="block truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Data + Parcelas ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1.5 h-12 rounded-xl" />
            </div>
            {/* Parcelas só aparece para crédito */}
            <AnimatePresence>
              {isCredit && type === "expense" && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3 text-purple-400" />
                    Parcelas
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="72"
                    value={installments}
                    onChange={e => setInstallments(e.target.value)}
                    className="mt-1.5 h-12 rounded-xl"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Resumo antes de salvar ── */}
          {amount && parseFloat(amount.replace(",", ".")) > 0 && isCredit && parseInt(installments) > 1 && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-3 text-sm">
              <p className="text-purple-300 font-semibold">
                {parseInt(installments)}x de R$ {parseFloat(amount.replace(",", ".")).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Total: R$ {(parseFloat(amount.replace(",", ".")) * parseInt(installments)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          <Button
            onClick={submit}
            disabled={addTx.isPending || scanning}
            className="w-full h-13 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow"
          >
            {addTx.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar lançamento"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
