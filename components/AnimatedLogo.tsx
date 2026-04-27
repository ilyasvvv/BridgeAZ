import clsx from "clsx";

export type LogoMotion =
  | "none"
  | "side-to-side"
  | "wiggle"
  | "peek"
  | "blink"
  | "loading"
  | "success"
  | "attention"
  | "orbit"
  | "escape"
  | "gather"
  | "morph"
  | "jelly"
  | "swap"
  | "portal"
  | "skate"
  | "sprout"
  | "pulse"
  | "slingshot"
  | "pop"
  | "landing-loop"
  | "wink"
  | "double-blink"
  | "wave"
  | "bop"
  | "drift"
  | "rocket"
  | "boomerang"
  | "high-five"
  | "moonwalk"
  | "sunrise"
  | "carousel"
  | "ripple"
  | "shy"
  | "spark"
  | "magnet"
  | "zoomies"
  | "drumroll"
  | "stretch"
  | "melt"
  | "full-hop"
  | "full-dance"
  | "full-sway"
  | "full-float"
  | "full-party"
  | "full-orbit"
  | "comet"
  | "bounce"
  | "scatter"
  | "both";

type AnimatedLogoProps = {
  size?: number;
  motion?: LogoMotion;
  className?: string;
  title?: string;
  showLoaderOrbit?: boolean;
};

export function AnimatedLogo({
  size = 180,
  motion = "both",
  className,
  title = "bizim circle animated logo",
  showLoaderOrbit,
}: AnimatedLogoProps) {
  const animated = motion !== "none";

  return (
    <span
      className={clsx(
        "animated-logo",
        animated && "animated-logo-active",
        motion === "wiggle" && "animated-logo-wiggle",
        motion === "side-to-side" && "animated-logo-slide",
        motion === "peek" && "animated-logo-peek",
        motion === "blink" && "animated-logo-blink",
        motion === "loading" && "animated-logo-loading",
        motion === "success" && "animated-logo-success",
        motion === "attention" && "animated-logo-attention",
        motion === "orbit" && "animated-logo-orbit",
        motion === "escape" && "animated-logo-escape",
        motion === "gather" && "animated-logo-gather",
        motion === "morph" && "animated-logo-morph",
        motion === "jelly" && "animated-logo-jelly",
        motion === "swap" && "animated-logo-swap",
        motion === "portal" && "animated-logo-portal",
        motion === "skate" && "animated-logo-skate",
        motion === "sprout" && "animated-logo-sprout",
        motion === "pulse" && "animated-logo-pulse",
        motion === "slingshot" && "animated-logo-slingshot",
        motion === "pop" && "animated-logo-pop",
        motion === "landing-loop" && "animated-logo-landing-loop",
        motion === "wink" && "animated-logo-wink",
        motion === "double-blink" && "animated-logo-double-blink",
        motion === "wave" && "animated-logo-wave",
        motion === "bop" && "animated-logo-bop",
        motion === "drift" && "animated-logo-drift",
        motion === "rocket" && "animated-logo-rocket",
        motion === "boomerang" && "animated-logo-boomerang",
        motion === "high-five" && "animated-logo-high-five",
        motion === "moonwalk" && "animated-logo-moonwalk",
        motion === "sunrise" && "animated-logo-sunrise",
        motion === "carousel" && "animated-logo-carousel",
        motion === "ripple" && "animated-logo-ripple",
        motion === "shy" && "animated-logo-shy",
        motion === "spark" && "animated-logo-spark",
        motion === "magnet" && "animated-logo-magnet",
        motion === "zoomies" && "animated-logo-zoomies",
        motion === "drumroll" && "animated-logo-drumroll",
        motion === "stretch" && "animated-logo-stretch",
        motion === "melt" && "animated-logo-melt",
        motion === "full-hop" && "animated-logo-full-hop",
        motion === "full-dance" && "animated-logo-full-dance",
        motion === "full-sway" && "animated-logo-full-sway",
        motion === "full-float" && "animated-logo-full-float",
        motion === "full-party" && "animated-logo-full-party",
        motion === "full-orbit" && "animated-logo-full-orbit",
        motion === "comet" && "animated-logo-comet",
        motion === "bounce" && "animated-logo-bounce",
        motion === "scatter" && "animated-logo-scatter",
        motion === "both" && "animated-logo-both",
        className
      )}
      style={{ width: size, height: size }}
      role="img"
      aria-label={title}
    >
      <svg
        viewBox="0 0 240 240"
        width={size}
        height={size}
        className="animated-logo-svg"
      >
        <circle
          className="animated-logo-ring"
          cx="120"
          cy="120"
          r="110"
          fill="#000"
        />
        <circle
          className="animated-logo-face"
          cx="120"
          cy="120"
          r="102"
          fill="#C1FF72"
        />
        {(showLoaderOrbit || motion === "loading" || motion === "comet") && (
          <circle
            className="animated-logo-loader-dot"
            cx="120"
            cy="0"
            r="7"
            fill="#000"
          />
        )}
        {motion === "scatter" && (
          <g className="animated-logo-echo-dots" aria-hidden>
            <circle cx="70" cy="132" r="7" fill="#000" />
            <circle cx="160" cy="132" r="7" fill="#000" />
            <circle cx="111" cy="152" r="5" fill="#000" />
          </g>
        )}
        <g className="animated-logo-dots">
          <circle cx="73" cy="100" r="13" fill="#000" />
          <circle cx="108" cy="100" r="13" fill="#000" />
        </g>
      </svg>
    </span>
  );
}

type LogoLockupProps = {
  size?: number;
  motion?: LogoMotion;
  className?: string;
};

export function BizimLogoLockup({
  size = 88,
  motion = "none",
  className,
}: LogoLockupProps) {
  const markSize = Math.round(size * 0.95);

  return (
    <div
      className={clsx(
        "bizim-logo-lockup",
        "bizim-logo-lockup-horizontal",
        className
      )}
    >
      <AnimatedLogo size={markSize} motion={motion} />
      <div
        className="bizim-logo-wordmark bizim-logo-wordmark-outline"
        style={{ fontSize: size * 0.48 }}
        aria-hidden
      >
        <span>bizim</span>
        <span>circle</span>
      </div>
    </div>
  );
}
