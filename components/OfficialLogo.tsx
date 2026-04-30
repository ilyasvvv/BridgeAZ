import clsx from "clsx";

export function OfficialLogo({
  width = 150,
  alt = "bizim circle",
  className,
}: {
  width?: number;
  alt?: string;
  className?: string;
}) {
  return (
    <img
      src="/brand/bizim-circle-logo-01.svg"
      alt={alt}
      width={width}
      height={Math.round(width / 2.73)}
      decoding="async"
      className={clsx("block h-auto", className)}
    />
  );
}
