"use client";

import clsx from "clsx";
import Link from "next/link";
import {
  ComponentProps,
  MouseEvent,
  ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/90 shadow-soft",
  secondary:
    "bg-paper text-ink border border-paper-line hover:border-ink/30 hover:shadow-soft",
  ghost: "bg-transparent text-ink hover:bg-ink/5",
  outline:
    "bg-transparent text-ink border border-ink/20 hover:border-ink hover:bg-ink hover:text-paper",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[12px] tracking-[0.02em]",
  md: "h-10 px-5 text-[13px] tracking-[0.02em]",
  lg: "h-12 px-6 text-[14px] tracking-[0.01em]",
};

type Ripple = { id: number; x: number; y: number; size: number };

type BaseProps = {
  variant?: Variant;
  size?: Size;
  leading?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
  className?: string;
  magnetic?: boolean;
};

const baseClass =
  "signature-btn relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-pill font-semibold select-none";

function useMagnet(enabled: boolean) {
  const ref = useRef<HTMLElement | null>(null);

  const onMove = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      if (!enabled || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const mx = e.clientX - (rect.left + rect.width / 2);
      const my = e.clientY - (rect.top + rect.height / 2);
      const dx = Math.max(-1, Math.min(1, mx / rect.width)) * 5;
      const dy = Math.max(-1, Math.min(1, my / rect.height)) * 3;
      ref.current.style.setProperty("--mx", `${dx}px`);
      ref.current.style.setProperty("--my", `${dy}px`);
    },
    [enabled]
  );

  const onLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.setProperty("--mx", `0px`);
    ref.current.style.setProperty("--my", `0px`);
  }, []);

  return { ref, onMove, onLeave };
}

function spawnRipple(
  e: MouseEvent<HTMLElement>,
  setRipples: (fn: (r: Ripple[]) => Ripple[]) => void
) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.4;
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;
  const id = Date.now() + Math.random();
  setRipples((list) => [...list, { id, x, y, size }]);
  window.setTimeout(
    () => setRipples((list) => list.filter((r) => r.id !== id)),
    620
  );
}

function Ripples({ ripples, tone }: { ripples: Ripple[]; tone: Variant }) {
  const color = tone === "primary" ? "rgba(255,255,255,0.35)" : "rgba(10,10,10,0.12)";
  return (
    <>
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden
          className="pointer-events-none absolute rounded-full animate-ripple"
          style={{
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
            background: color,
          }}
        />
      ))}
    </>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block w-3.5 h-3.5 rounded-full border-[1.5px] border-current border-t-transparent animate-spin"
    />
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M2.5 7.5L6 11l5.5-8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-check-draw"
      />
    </svg>
  );
}

type ButtonProps = BaseProps &
  Omit<ComponentProps<"button">, "children"> & {
    loading?: boolean;
    success?: boolean;
    successLabel?: ReactNode;
  };

export function Button({
  variant = "primary",
  size = "md",
  leading,
  trailing,
  children,
  className,
  magnetic = true,
  loading = false,
  success = false,
  successLabel,
  onClick,
  disabled,
  ...rest
}: ButtonProps) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const { ref, onMove, onLeave } = useMagnet(magnetic && !loading && !success);

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (loading || success || disabled) return;
    spawnRipple(e, setRipples);
    onClick?.(e);
  };

  const busy = loading || success;

  return (
    <button
      ref={ref as any}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={handleClick}
      disabled={disabled || busy}
      data-state={success ? "success" : loading ? "loading" : "idle"}
      className={clsx(
        baseClass,
        variants[variant],
        sizes[size],
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
      {...rest}
    >
      <Ripples ripples={ripples} tone={variant} />
      <span
        className={clsx(
          "relative inline-flex items-center gap-2 transition-all duration-300",
          busy && "opacity-0 scale-95"
        )}
      >
        {leading}
        {children}
        {trailing}
      </span>
      {loading && (
        <span className="absolute inset-0 inline-flex items-center justify-center">
          <Spinner />
        </span>
      )}
      {success && (
        <span className="absolute inset-0 inline-flex items-center justify-center gap-2">
          <Check />
          {successLabel}
        </span>
      )}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  leading,
  trailing,
  children,
  className,
  magnetic = true,
}: BaseProps & { href: string }) {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const { ref, onMove, onLeave } = useMagnet(magnetic);

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    spawnRipple(e, setRipples);
  };

  return (
    <Link
      href={href}
      ref={ref as any}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={handleClick}
      className={clsx(
        baseClass,
        variants[variant],
        sizes[size],
        className
      )}
    >
      <Ripples ripples={ripples} tone={variant} />
      <span className="relative inline-flex items-center gap-2">
        {leading}
        {children}
        {trailing}
      </span>
    </Link>
  );
}
