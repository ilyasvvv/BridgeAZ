const meters = [
  { label: "Signal", value: "88%", width: "88%", color: "from-[#ff4757] to-[#ff7b86]" },
  { label: "Latency", value: "12ms", width: "68%", color: "from-[#a8b2d1] to-[#ffffff]" },
  { label: "Sync", value: "Live", width: "94%", color: "from-[#22c55e] to-[#86efac]" }
];

const modules = [
  { title: "Mentors", value: "420" },
  { title: "Cities", value: "38" },
  { title: "Projects", value: "96" }
];

export default function HeroDevice() {
  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute -left-6 top-10 hidden h-24 w-6 rounded-l-2xl bg-[#c6ced9] shadow-industrial-card md:block" />
      <div className="absolute -right-5 top-24 hidden h-16 w-5 rounded-r-2xl bg-[#c6ced9] shadow-industrial-card md:block" />
      <div className="industrial-panel rounded-[32px] border-[4px] border-[#b6c0cf] bg-[#d7dee9] p-5 shadow-[18px_22px_38px_rgba(126,139,159,0.36),-12px_-12px_28px_rgba(255,255,255,0.7)] transition-transform duration-300 ease-mechanical hover:scale-[1.01]">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-[#ff4757] shadow-industrial-glow" />
            <span className="industrial-label">BridgeAZ terminal</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="industrial-vent h-6 w-1.5" />
            <span className="industrial-vent h-6 w-1.5" />
            <span className="industrial-vent h-6 w-1.5" />
          </div>
        </div>
        <div className="industrial-screen aspect-[4/5] p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#a8b2d1]">
                System operational
              </p>
              <h3 className="mt-3 max-w-[12rem] text-2xl font-bold tracking-tight text-white">
                Control bridge for the diaspora.
              </h3>
            </div>
            <div className="rounded-full border border-white/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[#ff9ca4]">
              PWR
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {modules.map((module) => (
              <div
                key={module.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#a8b2d1]">
                  {module.title}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">{module.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[26px] border border-white/10 bg-[rgba(14,18,24,0.65)] p-4 shadow-[inset_0_2px_12px_rgba(0,0,0,0.4)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#a8b2d1]">
                Live routing
              </p>
              <div className="h-10 w-10 rounded-full border border-[#ff4757]/40 bg-[conic-gradient(from_90deg,rgba(255,71,87,0.8),transparent,rgba(255,71,87,0.8))] p-[2px] animate-spin [animation-duration:4s]">
                <div className="h-full w-full rounded-full bg-[#10161d]" />
              </div>
            </div>
            <div className="space-y-3">
              {meters.map((meter) => (
                <div key={meter.label}>
                  <div className="mb-1 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-[#a8b2d1]">
                    <span>{meter.label}</span>
                    <span>{meter.value}</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/5 p-[2px] shadow-[inset_0_1px_4px_rgba(0,0,0,0.35)]">
                    <div className={`h-full rounded-full bg-gradient-to-r ${meter.color}`} style={{ width: meter.width }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#a8b2d1]">
                Active channels
              </p>
              <div className="mt-3 flex items-end gap-2">
                {[42, 68, 54, 82, 73, 91, 58].map((height, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-full bg-gradient-to-t from-[#ff4757] via-[#ff9ca4] to-[#ffffff]"
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#a8b2d1]">
                Status beacons
              </p>
              <div className="mt-4 space-y-3">
                {[
                  ["Baku", "#22c55e"],
                  ["Istanbul", "#ff4757"],
                  ["New York", "#f59e0b"]
                ].map(([city, color]) => (
                  <div key={city} className="flex items-center justify-between">
                    <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-white">
                      {city}
                    </span>
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
