import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useProfile } from "@/hooks/useFinance";
import { PiggyMascot } from "@/components/PiggyMascot";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, LogOut, Shield, Github, Bell } from "lucide-react";

const Row = ({ icon: Icon, title, desc, action }: any) => (
  <div className="flex items-center gap-3 p-4">
    <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
      <Icon className="h-5 w-5 text-foreground" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm">{title}</p>
      {desc && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>}
    </div>
    {action}
  </div>
);

const Settings = () => {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { data: profile } = useProfile();

  return (
    <div className="px-5 pt-6 space-y-5">
      <h1 className="font-display text-2xl font-bold tracking-tight">Ajustes</h1>

      <section className="glass border border-border/60 rounded-3xl p-5 flex items-center gap-4 shadow-card">
        <PiggyMascot size={64} float={false} />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold truncate">{profile?.display_name || "Você"}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      </section>

      <section className="glass border border-border/60 rounded-3xl shadow-card divide-y divide-border/40">
        <Row
          icon={theme === "dark" ? Moon : Sun}
          title="Tema escuro"
          desc="Alterne entre claro e escuro"
          action={<Switch checked={theme === "dark"} onCheckedChange={toggle} />}
        />
        <Row icon={Bell} title="Notificações" desc="Em breve: alertas de gastos e metas" action={<Switch disabled />} />
        <Row icon={Shield} title="Privacidade" desc="Seus dados são criptografados e só você acessa." />
      </section>

      <section className="glass border border-border/60 rounded-3xl p-5 shadow-card">
        <h3 className="font-display font-semibold flex items-center gap-2"><Github className="h-4 w-4" /> Pronto para escalar</h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Arquitetura preparada para Open Finance via backend intermediário (Belvo) e migração futura para IA real.
          Todos os dados estão protegidos por <span className="text-primary font-semibold">RLS</span>.
        </p>
      </section>

      <Button onClick={signOut} variant="outline" className="w-full h-12 rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
        <LogOut className="h-4 w-4 mr-2" /> Sair da conta
      </Button>

      <p className="text-center text-xs text-muted-foreground pt-2">Pigly · v0.1 MVP</p>
    </div>
  );
};

export default Settings;
