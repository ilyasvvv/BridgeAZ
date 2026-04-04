// Qovshaq Phase 0 — Base card component
import { motion } from "framer-motion";

export default function QCard({
  children,
  className = "",
  hover = false,
  onClick,
  ...props
}) {
  const Component = hover || onClick ? motion.div : "div";
  const motionProps =
    hover || onClick
      ? {
          whileHover: { y: -2, boxShadow: "0 2px 6px rgba(44,40,37,0.06), 0 8px 24px rgba(44,40,37,0.1), 0 0 0 0.5px rgba(44,40,37,0.03)" },
          transition: { type: "spring", stiffness: 400, damping: 30 },
        }
      : {};

  return (
    <Component
      className={`bg-q-surface rounded-xl shadow-q-card border border-q-border/50 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
      onClick={onClick}
      {...motionProps}
      {...props}
    >
      {children}
    </Component>
  );
}
