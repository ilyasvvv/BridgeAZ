export default function IndustrialButton({
  as: Component = "button",
  variant = "secondary",
  size = "md",
  fullWidth = false,
  icon: Icon,
  className = "",
  children,
  style,
  ...props
}) {
  const sizeStyles = {
    sm: { padding: "0.78rem 1rem", fontSize: "0.72rem" },
    md: { padding: "0.9rem 1.2rem", fontSize: "0.77rem" },
    lg: { padding: "0.98rem 1.4rem", fontSize: "0.82rem" }
  };

  const componentProps = {
    className: [
      "industrial-button",
      `industrial-button-${variant}`,
      fullWidth ? "w-full" : "",
      className
    ]
      .filter(Boolean)
      .join(" "),
    style: { ...(sizeStyles[size] || sizeStyles.md), ...style },
    ...props
  };

  if (Component === "button" && !componentProps.type) {
    componentProps.type = "button";
  }

  return (
    <Component {...componentProps}>
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      <span>{children}</span>
    </Component>
  );
}
