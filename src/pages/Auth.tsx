import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PiggyMascot } from "@/components/PiggyMascot";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
  name: z.string().trim().max(60).optional(),
});

const Auth = () => {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo: `${window.location.origin}/app`,
            data: { display_name: form.name || form.email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Bem-vindo(a) 🐷");
        nav("/app");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (error) throw error;
        toast.success("Bom te ver de novo!");
        nav("/app");
      }
    } catch (err: any) {
      const msg = err?.message?.includes("Invalid login") ? "E-mail ou senha incorretos" : err?.message ?? "Erro ao autenticar";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background gradient-mesh flex flex-col">
      <div className="max-w-md w-full mx-auto px-6 pt-8 pb-12 flex-1 flex flex-col">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <div className="flex-1 flex flex-col justify-center">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4"><PiggyMascot size={110} /></div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              {mode === "login" ? "Bem-vindo de volta" : "Crie sua conta"}
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              {mode === "login" ? "Entre para continuar com a Pigly" : "Comece a organizar suas finanças hoje"}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4 glass border border-border/60 rounded-3xl p-6 shadow-card">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Como podemos te chamar?" className="mt-1.5 h-12 rounded-xl" />
              </div>
            )}
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="seu@email.com" className="mt-1.5 h-12 rounded-xl" />
            </div>
            <div>
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" className="mt-1.5 h-12 rounded-xl" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold shadow-glow hover:opacity-95">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "login" ? "Ainda não tem conta?" : "Já tem conta?"}{" "}
            <button onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-primary font-semibold hover:underline">
              {mode === "login" ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
