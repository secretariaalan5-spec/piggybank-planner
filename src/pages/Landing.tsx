import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PiggyMascot } from "@/components/PiggyMascot";
import { motion } from "framer-motion";
import { Sparkles, Target, TrendingUp, Shield } from "lucide-react";

const features = [
  { icon: TrendingUp, title: "Dashboard claro", desc: "Veja em 1 segundo onde seu dinheiro está indo." },
  { icon: Target, title: "Metas que motivam", desc: "Crie objetivos com progresso visual e prazos." },
  { icon: Sparkles, title: "IA conselheira", desc: "Dicas personalizadas do seu porquinho." },
  { icon: Shield, title: "Privacidade total", desc: "Seus dados são seus. Criptografia ponta a ponta." },
];

const Landing = () => (
  <div className="min-h-screen bg-background gradient-mesh">
    <div className="max-w-md mx-auto px-6 pt-12 pb-24">
      <header className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐷</span>
          <span className="font-display font-bold text-lg">Pigly</span>
        </div>
        <Link to="/auth"><Button variant="ghost" size="sm">Entrar</Button></Link>
      </header>

      <section className="text-center">
        <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.6, ease: [0.32,0.72,0.24,1] }} className="flex justify-center mb-8">
          <PiggyMascot size={180} />
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }} className="font-display text-4xl font-extrabold tracking-tight text-balance leading-[1.05]">
          Suas finanças,<br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">com inteligência.</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.6 }} className="text-muted-foreground mt-4 text-balance">
          Controle gastos, defina metas e receba dicas do seu porquinho conselheiro. Bonito, simples e seguro.
        </motion.p>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }} className="mt-8 flex flex-col gap-3">
          <Link to="/auth"><Button size="lg" className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-semibold text-base shadow-glow hover:opacity-95">Começar grátis</Button></Link>
          <p className="text-xs text-muted-foreground">Sem cartão. Sem cobranças. Sem complicação.</p>
        </motion.div>
      </section>

      <section className="mt-16 grid grid-cols-2 gap-3">
        {features.map((f, i) => (
          <motion.div key={f.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i*0.08 }} className="glass border border-border/60 rounded-2xl p-4">
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow mb-3">
              <f.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <h3 className="font-display font-semibold text-sm">{f.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-snug">{f.desc}</p>
          </motion.div>
        ))}
      </section>

      <footer className="mt-16 text-center text-xs text-muted-foreground">
        Feito com 💚 para sua liberdade financeira.
      </footer>
    </div>
  </div>
);

export default Landing;
