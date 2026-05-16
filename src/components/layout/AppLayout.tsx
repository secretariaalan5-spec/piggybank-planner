import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Home, PlusCircle, BarChart2, Bot, Settings, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { ReactNode } from "react";

const tabs = [
  { to: "/app", label: "Home", icon: Home, end: true },
  { to: "/app/transactions", label: "Extrato", icon: PlusCircle },
  { to: "/app/insights", label: "Resumo", icon: BarChart2 },
  { to: "/app/chat", label: "Oink AI", icon: Bot },
  { to: "/app/settings", label: "Ajustes", icon: Settings },
];

export const AppLayout = ({ children }: { children?: ReactNode }) => {
  const loc = useLocation();
  return (
    <div className="min-h-[100dvh] bg-background gradient-mesh flex justify-center overflow-x-hidden overscroll-none">
      <div className="w-full max-w-[480px] flex flex-col min-h-[100dvh] relative">
        <main className="flex-1 pb-20 pt-[env(safe-area-inset-top)]">
          <motion.div
            key={loc.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.32, 0.72, 0.24, 1] }}
          >
            {children ?? <Outlet />}
          </motion.div>
        </main>
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-[480px] bg-background/80 backdrop-blur-2xl border-t border-border/60 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),_0.75rem)]">
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
