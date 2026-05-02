import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";
const Ctx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} });

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("pigly-theme") as Theme) || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    localStorage.setItem("pigly-theme", theme);
  }, [theme]);

  return <Ctx.Provider value={{ theme, toggle: () => setTheme(t => t === "dark" ? "light" : "dark") }}>{children}</Ctx.Provider>;
};

export const useTheme = () => useContext(Ctx);
