// Qovshaq Phase 0 — Button with micro-animations
import { motion } from "framer-motion";

const variants = {
  primary: "bg-q-primary text-white hover:bg-q-primary/90 shadow-q-card hover:shadow-q-elevated",
  secondary: "bg-q-secondary text-white hover:bg-q-secondary/90 shadow-q-card hover:shadow-q-elevated",
  accent: "bg-q-accent text-white hover:bg-q-accent/90 shadow-q-card hover:shadow-q-elevated",
  outline: "border border-q-border text-q-text hover:bg-q-surface-alt",
  ghost: "text-q-text-muted hover:text-q-text hover:bg-q-surface-alt",
  danger: "bg-q-danger text-white hover:bg-q-danger/90",
};

const sizeMap = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-6 py-3 text-base rounded-xl",
};

export default function QButton({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  ...props
}) {
  return (
    <motion.button
      whileHover={disabled ? {} : { scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all ${variants[variant]} ${sizeMap[size]} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}
