import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, CreditCard, PiggyBank, Banknote, TrendingUp,
  Plus, Trash2, Building2
} from "lucide-react";
import { useAccounts, useAddAccount, useDeleteAccount } from "@/hooks/useFinance";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


const ACCOUNT_TYPES = [
  { value: "checking",   label: "Conta Corrente", icon: Building2,  color: "#3b82f6" },
  { value: "savings",    label: "Poupança",        icon: PiggyBank,  color: "#10b981" },
  { value: "credit",     label: "Cartão Crédito",  icon: CreditCard, color: "#8b5cf6" },
  { value: "cash",       label: "Dinheiro",        icon: Banknote,   color: "#f59e0b" },
  { value: "investment", label: "Investimentos",   icon: TrendingUp, color: "#06b6d4" },
];

const ACCOUNT_COLORS = [
  "#10b981","#3b82f6","#8b5cf6","#f59e0b","#ef4444",
  "#ec4899","#06b6d4","#f97316","#6366f1","#14b8a6",
];

function getIcon(type: string) {
  return ACCOUNT_TYPES.find(t => t.value === type)?.icon ?? Wallet;
}

function getTypeLabel(type: string) {
  return ACCOUNT_TYPES.find(t => t.value === type)?.label ?? type;
}

function formatCurrency(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ── Add Account Sheet ─────────────────────────────────────────
function AddAccountSheet() {
  const [open, setOpen] = useState(false);
  const [name, setName]         = useState("");
  const [type, setType]         = useState("checking");
  const [balance, setBalance]   = useState("");
  const [limit, setLimit]       = useState("");
  const [color, setColor]       = useState("#3b82f6");
  const addAccount = useAddAccount();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    navigator.vibrate?.(10);
    await addAccount.mutateAsync({
      name: name.trim(),
      type,
      balance: parseFloat(balance || "0"),
      credit_limit: type === "credit" ? parseFloat(limit || "0") : undefined,
      color,
      icon: type === "checking" ? "Building2" : type === "savings" ? "PiggyBank" : type === "credit" ? "CreditCard" : type === "cash" ? "Banknote" : type === "investment" ? "TrendingUp" : "Wallet",
    });
    setOpen(false);
    setName(""); setBalance(""); setLimit(""); setType("checking");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button 
          onClick={() => navigator.vibrate?.(10)}
          className="flex flex-col items-center justify-center gap-1.5 glass border border-dashed border-border/60 rounded-2xl p-4 w-full text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
        >
          <Plus className="h-5 w-5" />
          <span className="text-xs font-semibold">Nova conta</span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl border-border/60 glass pb-safe">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-display text-xl">Nova Conta</SheetTitle>
        </SheetHeader>
        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Tipo</Label>
            <div className="grid grid-cols-3 gap-2">
              {ACCOUNT_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => { setType(value); setColor(ACCOUNT_TYPES.find(t=>t.value===value)?.color ?? color); navigator.vibrate?.(5); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl border text-xs font-semibold transition-all ${
                    type === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="acc-name" className="text-xs text-muted-foreground">Nome</Label>
            <Input id="acc-name" placeholder='ex: "Nubank", "Inter"'
              value={name} onChange={e => setName(e.target.value)}
              className="mt-1" />
          </div>

          <div>
            <Label htmlFor="acc-balance" className="text-xs text-muted-foreground">
              {type === "credit" ? "Fatura atual" : "Saldo inicial"}
            </Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input id="acc-balance" type="number" inputMode="decimal" placeholder="0,00"
                value={balance} onChange={e => setBalance(e.target.value)}
                className="pl-9" />
            </div>
          </div>

          {type === "credit" && (
            <div>
              <Label htmlFor="acc-limit" className="text-xs text-muted-foreground">Limite do cartão</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
                <Input id="acc-limit" type="number" inputMode="decimal" placeholder="0,00"
                  value={limit} onChange={e => setLimit(e.target.value)}
                  className="pl-9" />
              </div>
            </div>
          )}

          {/* Color picker */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {ACCOUNT_COLORS.map(c => (
                <button key={c} onClick={() => { setColor(c); navigator.vibrate?.(5); }}
                  className={`h-7 w-7 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={addAccount.isPending || !name.trim()}
            className="w-full gradient-primary text-primary-foreground font-semibold rounded-2xl h-12 shadow-glow">
            {addAccount.isPending ? "Salvando…" : "Adicionar conta"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Accounts Page ─────────────────────────────────────────────
const Accounts = () => {
  const { data: accounts = [], isLoading } = useAccounts();
  const deleteAccount = useDeleteAccount();
  const [confirm, setConfirm] = useState<string | null>(null);

  const totalBalance = accounts
    .filter(a => a.type !== "credit")
    .reduce((s, a) => s + Number(a.balance), 0);

  const totalCredit = accounts
    .filter(a => a.type === "credit")
    .reduce((s, a) => s + Number(a.balance), 0);

  return (
    <div className="px-5 pt-6 space-y-5 pb-8">
      <header>
        <p className="text-sm text-muted-foreground">Visão geral</p>
        <h1 className="font-display text-2xl font-bold tracking-tight">Minhas Contas</h1>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass border border-border/60 rounded-2xl p-4 shadow-card">
          <p className="text-xs text-muted-foreground mb-1">Saldo total</p>
          <p className="font-display text-xl font-bold text-success">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="glass border border-border/60 rounded-2xl p-4 shadow-card">
          <p className="text-xs text-muted-foreground mb-1">Fatura total</p>
          <p className="font-display text-xl font-bold text-destructive">{formatCurrency(totalCredit)}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="font-display font-semibold px-1">Minhas Contas</h3>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <AnimatePresence>
            {accounts.map((acc, i) => {
              const Icon = getIcon(acc.type);
              const isNegative = acc.type === "credit";
              return (
                <motion.div
                  key={acc.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass border border-border/60 rounded-2xl p-4 shadow-card flex items-center gap-4"
                >
                  <div className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: acc.color + "22" }}>
                    <Icon className="h-5 w-5" style={{ color: acc.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{acc.name}</p>
                    <p className="text-xs text-muted-foreground">{getTypeLabel(acc.type)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-display font-bold text-base ${isNegative ? "text-destructive" : "text-success"}`}>
                      {isNegative ? "-" : ""}{formatCurrency(Number(acc.balance))}
                    </p>
                    {acc.type === "credit" && acc.credit_limit && (
                      <p className="text-xs text-muted-foreground">
                        lim. {formatCurrency(Number(acc.credit_limit))}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => { setConfirm(confirm === acc.id ? null : acc.id); navigator.vibrate?.(5); }}
                    className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        <AddAccountSheet />
      </section>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 inset-x-4 max-w-[460px] mx-auto glass border border-destructive/40 rounded-3xl p-4 shadow-elevated z-50 flex items-center gap-3"
          >
            <p className="flex-1 text-sm font-semibold">Remover esta conta?</p>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(null)}>Cancelar</Button>
            <Button size="sm" variant="destructive"
              onClick={() => { deleteAccount.mutate(confirm!); setConfirm(null); navigator.vibrate?.(10); }}>
              Remover
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Accounts;
