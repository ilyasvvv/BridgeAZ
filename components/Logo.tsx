import clsx from "clsx";
import { OfficialLogo } from "./OfficialLogo";

export function Logo({
  size = 28,
  withWord = true,
  className,
}: {
  size?: number;
  withWord?: boolean;
  className?: string;
}) {
  if (withWord) {
    return <OfficialLogo width={Math.round(size * 4.7)} className={className} />;
  }

  return (
    <div className={clsx("inline-flex items-center gap-2.5", className)}>
      <span
        className="relative inline-flex items-center justify-center rounded-full bg-ink text-paper"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <span
          className="absolute inset-[4px] rounded-full border border-paper/50"
          aria-hidden
        />
        <span className="relative text-[10px] font-black tracking-tight">b</span>
      </span>
    </div>
  );
}
