// Qovshaq Phase 0 — Form input with focus animations
import { useState } from "react";

export default function QInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
  className = "",
  error,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const Tag = multiline ? "textarea" : "input";

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-q-text mb-1.5">{label}</label>
      )}
      <Tag
        type={multiline ? undefined : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={multiline ? rows : undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`w-full px-4 py-2.5 bg-q-surface border rounded-lg text-q-text placeholder:text-q-text-muted/50 font-q-body text-sm transition-all outline-none ${
          focused
            ? "border-q-primary ring-2 ring-q-primary/10"
            : error
            ? "border-q-danger"
            : "border-q-border hover:border-q-text-muted/40"
        } ${multiline ? "resize-none" : ""}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-q-danger">{error}</p>}
    </div>
  );
}
