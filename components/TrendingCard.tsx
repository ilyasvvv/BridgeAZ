import Link from "next/link";
import { Icon } from "./Icon";

const items = [
  { tag: "Novruz2026", count: "1.2K posts", trend: "+42%" },
  { tag: "BerlinMeetup", count: "384 posts", trend: "+18%" },
  { tag: "GradSchoolApps", count: "296 posts", trend: "+12%" },
  { tag: "MoveToUAE", count: "204 posts", trend: "+8%" },
  { tag: "TeaAndDomino", count: "112 posts", trend: "+6%" },
];

const spotlight = [
  { title: "Azerbaijanis in Munich", kind: "Circle", meta: "826 members · Germany" },
  { title: "London Diaspora Picnic", kind: "Event", meta: "Sat · Hyde Park" },
  { title: "Frontend role at a Berlin studio", kind: "Opportunity", meta: "Remote · EU" },
];

export function TrendingCard() {
  return (
    <div className="rail-card rail-card-right rounded-[22px] bg-paper border border-paper-line overflow-hidden [--rail-compact:365px] [--rail-expanded:700px]">
      <div className="p-4 border-b border-paper-line flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-ink text-paper">
          <Icon.Trend size={13} />
        </span>
        <h3 className="text-[13px] font-bold tracking-tight">Trending in your circle</h3>
      </div>

      <ul className="divide-y divide-paper-line">
        {items.map((t, i) => (
          <li key={t.tag} className={i > 3 ? "rail-extra" : undefined}>
            <Link
              href={`/search?q=${encodeURIComponent("#" + t.tag)}`}
              className="flex items-center gap-3 p-3 hover:bg-paper-cool transition"
            >
              <span className="text-[11px] text-ink/45 font-semibold w-5">{String(i + 1).padStart(2, "0")}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold truncate">#{t.tag}</div>
                <div className="text-[11px] text-ink/50">{t.count}</div>
              </div>
              <span className="text-[11px] font-semibold text-ink/70">{t.trend}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="rail-extra rail-spotlight p-4 border-t border-paper-line">
        <h4 className="text-[10.5px] font-bold tracking-[0.18em] text-ink/50 mb-2">SPOTLIGHT</h4>
        <div className="space-y-2">
          {spotlight.map((s) => (
            <Link
              key={s.title}
              href="#"
              className="block p-2.5 rounded-[14px] bg-paper-warm hover:bg-paper-cool border border-paper-line transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-[9.5px] font-bold tracking-[0.14em] text-ink/55 uppercase bg-paper px-1.5 py-0.5 rounded-full border border-paper-line">
                  {s.kind}
                </span>
                <div className="text-[13px] font-semibold truncate">{s.title}</div>
              </div>
              <div className="text-[11px] text-ink/50 mt-1">{s.meta}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
