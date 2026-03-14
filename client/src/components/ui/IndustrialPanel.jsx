const screwPositions = [
  { top: "12px", left: "12px" },
  { top: "12px", right: "12px" },
  { bottom: "12px", left: "12px" },
  { bottom: "12px", right: "12px" }
];

export default function IndustrialPanel({
  as: Component = "div",
  elevated = false,
  recessed = false,
  screws = true,
  vents = false,
  className = "",
  children,
  ...props
}) {
  return (
    <Component
      className={`industrial-panel ${className}`.trim()}
      data-elevated={elevated}
      data-recessed={recessed}
      {...props}
    >
      {screws
        ? screwPositions.map((position, index) => (
            <span
              key={index}
              aria-hidden="true"
              className="industrial-screw"
              style={position}
            />
          ))
        : null}
      {vents ? (
        <div className="absolute right-8 top-6 flex gap-1.5" aria-hidden="true">
          <span className="industrial-vent" />
          <span className="industrial-vent" />
          <span className="industrial-vent" />
        </div>
      ) : null}
      {children}
    </Component>
  );
}
