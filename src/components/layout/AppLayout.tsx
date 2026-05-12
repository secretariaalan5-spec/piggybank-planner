import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Home, ArrowLeftRight, Target, Sparkles, Settings, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { ReactNode } from "react";

const tabs = [
  { to: "/app", label: "Início", icon: Home, end: true },
  { to: "/app/transactions", label: "Lançamentos", icon: ArrowLeftRight },
  { to: "/app/goals", label: "Metas", icon: Target },
  { to: "/app/accounts", label: "Contas", icon: Wallet },
  { to: "/app/settings", label: "Ajustes", icon: Settings },
];

export const AppLayout = ({ children }: { children?: ReactNode }) => {
  const loc = useLocation();
  return (
    <div className="min-h-screen bg-background gradient-mesh flex justify-center">
      <div className="w-full max-w-[480px] flex flex-col min-h-screen relative">
        <main className="flex-1 pb-24 safe-top">
          <motion.div
            key={loc.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0.24, 1] }}
          >
            {children ?? <Outlet />}
          </motion.div>
        </main>
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none safe-bottom">
          <div className="pointer-events-auto m-3 w-full max-w-[460px] glass border border-border/60 rounded-3xl shadow-elevated px-2 py-2">
            <ul className="flex justify-between items-center">
              {tabs.map(({ to, label, icon: Icon, end }) => (
                <li key={to} className="flex-1">
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-1 py-2 px-1 rounded-2xl transition-all ${
                        isActive
                          ? "text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <div className="relative flex flex-col items-center gap-1">
                        {isActive && (
                          <motion.span
                            layoutId="tab-pill"
                            className="absolute inset-0 -m-1 -mx-3 gradient-primary rounded-2xl shadow-glow"
                            transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          />
                        )}
                        <Icon className={`relative z-10 h-5 w-5 ${isActive ? "text-primary-foreground" : ""}`} strokeWidth={2.2} />
                        <span className={`relative z-10 text-[10px] font-semibold tracking-wide ${isActive ? "text-primary-foreground" : ""}`}>{label}</span>
                      </div>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>
    </div>
  );
};
