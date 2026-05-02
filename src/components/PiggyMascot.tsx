import piggy from "@/assets/piggy-mascot.png";
import { motion } from "framer-motion";

interface Props { size?: number; className?: string; float?: boolean; }

export const PiggyMascot = ({ size = 96, className = "", float = true }: Props) => (
  <motion.img
    src={piggy}
    alt="Pigly, seu porquinho conselheiro"
    width={size}
    height={size}
    style={{ width: size, height: size }}
    className={`object-contain drop-shadow-[0_8px_24px_hsl(var(--primary)/0.4)] ${className}`}
    animate={float ? { y: [0, -6, 0] } : undefined}
    transition={float ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : undefined}
    loading="lazy"
  />
);
