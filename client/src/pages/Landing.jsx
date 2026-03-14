import { Link } from "react-router-dom";
import HeroDevice from "../components/HeroDevice";
import IndustrialButton from "../components/ui/IndustrialButton";
import IndustrialPanel from "../components/ui/IndustrialPanel";
import SectionLabel from "../components/ui/SectionLabel";
import StatusLamp from "../components/ui/StatusLamp";

const stats = [
  { label: "Members worldwide", value: "3,500+", status: "online" },
  { label: "Mentorship matches", value: "420", status: "alert" },
  { label: "Community projects launched", value: "96", status: "warning" }
];

const workflow = [
  {
    title: "Map your profile",
    body: "Students and professionals publish a verified signal about what they study, build, and need next."
  },
  {
    title: "Route the right people",
    body: "BridgeAZ surfaces mentors, peers, and collaborators across cities without turning discovery into noise."
  },
  {
    title: "Ship opportunities",
    body: "Internships, project feedback, and warm introductions move through one shared control panel."
  }
];

const audiences = [
  {
    title: "For Students",
    description:
      "Find mentors, share progress, and unlock internships from anywhere without getting lost in a generic social feed.",
    points: [
      "Discover verified mentors in your field",
      "Share project updates and get useful feedback",
      "Connect with peers across campuses"
    ],
    icon: OrbitIcon
  },
  {
    title: "For Professionals",
    description:
      "Give back to the next generation while keeping direct contact with emerging talent, projects, and community momentum.",
    points: [
      "Mentor students who mirror your early path",
      "Surface internships and team opportunities",
      "Stay connected to the wider diaspora network"
    ],
    icon: BriefcaseIcon
  }
];

const testimonials = [
  {
    name: "Nihad, Baku",
    quote: "BridgeAZ helped me find alumni in Turkey who guided my grad school path."
  },
  {
    name: "Aysel, Istanbul",
    quote: "The community feels warm and approachable. It is not just another network."
  },
  {
    name: "Murad, New York",
    quote: "I met my mentor within a week and landed an internship in fintech."
  }
];

export default function Landing() {
  return (
    <div className="industrial-grid overflow-hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 pb-20 pt-8 md:px-8 md:pb-24 md:pt-10">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center">
          <div className="space-y-7">
            <SectionLabel accent>Industrial realism interface</SectionLabel>
            <StatusLamp label="System operational" />
            <div className="space-y-5">
              <h1 className="industrial-embossed max-w-[11ch] text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] text-[var(--industrial-text)] md:text-6xl xl:text-7xl">
                BridgeAZ is the control bridge for a global Azerbaijani community.
              </h1>
              <p className="max-w-[37rem] text-lg leading-8 text-[var(--industrial-text-muted)]">
                Students and professionals connect here for mentorship, opportunities, and collaboration through a network
                that feels engineered, not chaotic.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <IndustrialButton as={Link} to="/join" variant="primary" size="lg">
                Join as student
              </IndustrialButton>
              <IndustrialButton as={Link} to="/join" variant="secondary" size="lg">
                Join as professional
              </IndustrialButton>
              <IndustrialButton as="a" href="#workflow" variant="ghost" size="lg">
                Inspect workflow
              </IndustrialButton>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <IndustrialPanel className="p-5 pr-14" vents>
                <SectionLabel className="w-fit">Signal quality</SectionLabel>
                <p className="mt-4 text-xl font-bold tracking-tight text-[var(--industrial-text)]">
                  Verified people, focused introductions, and less platform noise.
                </p>
              </IndustrialPanel>
              <IndustrialPanel className="p-5">
                <SectionLabel className="w-fit">Live readout</SectionLabel>
                <div className="mt-4 space-y-3 font-mono text-[13px] uppercase tracking-[0.12em] text-[var(--industrial-text-muted)]">
                  <div className="flex items-center justify-between">
                    <span>Mentor availability</span>
                    <span className="text-[var(--industrial-accent)]">Active</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Regional reach</span>
                    <span>Worldwide</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Trust layer</span>
                    <span>Verified</span>
                  </div>
                </div>
              </IndustrialPanel>
            </div>
          </div>

          <HeroDevice />
        </section>

        <section id="overview">
          <IndustrialPanel className="industrial-dark-panel px-6 py-7 md:px-8">
            <div className="grid gap-5 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:items-center">
              <div className="relative z-[1] max-w-sm">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ff9ca4]">Telemetry strip</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
                  Reliable numbers mounted to a single chassis.
                </h2>
              </div>
              {stats.map((stat) => (
                <div key={stat.label} className="relative z-[1] rounded-[22px] border border-white/10 bg-white/5 px-5 py-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor:
                          stat.status === "online" ? "#22c55e" : stat.status === "warning" ? "#f59e0b" : "#ff4757",
                        boxShadow:
                          stat.status === "online"
                            ? "0 0 12px rgba(34,197,94,0.95)"
                            : stat.status === "warning"
                              ? "0 0 12px rgba(245,158,11,0.95)"
                              : "0 0 12px rgba(255,71,87,0.95)"
                      }}
                    />
                    <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#a8b2d1]">
                      {stat.label}
                    </span>
                  </div>
                  <p className="font-mono text-4xl font-bold tracking-tight text-white">{stat.value}</p>
                </div>
              ))}
            </div>
          </IndustrialPanel>
        </section>

        <section id="workflow" className="space-y-8">
          <div className="space-y-4 text-center">
            <SectionLabel accent className="mx-auto w-fit">
              How the system works
            </SectionLabel>
            <h2 className="industrial-embossed text-4xl font-bold tracking-tight text-[var(--industrial-text)] md:text-5xl">
              A clear path from profile to opportunity.
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-8 text-[var(--industrial-text-muted)]">
              The platform behaves more like a reliable console than a noisy feed: signal in, routing logic, useful output.
            </p>
          </div>

          <div className="relative grid gap-6 md:grid-cols-3">
            <div className="absolute left-[16.66%] right-[16.66%] top-[4.1rem] hidden md:block">
              <div className="industrial-pipe" />
            </div>
            {workflow.map((step, index) => (
              <IndustrialPanel key={step.title} elevated className="p-6 pt-16">
                <div className="absolute left-6 top-5 flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(145deg,#edf2f8,#d9e0ea)] font-mono text-sm font-bold uppercase tracking-[0.1em] text-[var(--industrial-accent)] shadow-industrial-floating">
                  0{index + 1}
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-[var(--industrial-text)]">{step.title}</h3>
                <p className="mt-3 max-w-[26ch] text-base leading-7 text-[var(--industrial-text-muted)]">{step.body}</p>
              </IndustrialPanel>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <IndustrialPanel className="p-6 md:p-8">
            <SectionLabel accent className="w-fit">
              Why it lands
            </SectionLabel>
            <h2 className="industrial-embossed mt-5 text-4xl font-bold tracking-tight text-[var(--industrial-text)]">
              Built for practical trust, not empty reach.
            </h2>
            <div className="mt-6 grid gap-4">
              {[
                "Mentorship that actually feels human",
                "Community matches across locations worldwide",
                "Verified profiles for higher trust"
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[20px] bg-[rgba(255,255,255,0.48)] px-5 py-4 shadow-[4px_4px_8px_rgba(0,0,0,0.08),-2px_-2px_6px_rgba(255,255,255,0.7)]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(145deg,#edf2f8,#d9e0ea)] shadow-industrial-card">
                      <SparkIcon className="h-5 w-5 text-[var(--industrial-accent)]" />
                    </div>
                    <p className="text-base font-semibold text-[var(--industrial-text)]">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </IndustrialPanel>

          <div className="grid gap-6 md:grid-cols-2">
            {audiences.map((audience) => {
              const Icon = audience.icon;

              return (
                <IndustrialPanel key={audience.title} elevated className="p-6 md:p-7">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(145deg,#edf2f8,#d9e0ea)] shadow-industrial-floating">
                    <Icon className="h-7 w-7 text-[var(--industrial-accent)]" />
                  </div>
                  <h3 className="mt-5 text-2xl font-bold tracking-tight text-[var(--industrial-text)]">{audience.title}</h3>
                  <p className="mt-3 text-base leading-7 text-[var(--industrial-text-muted)]">{audience.description}</p>
                  <ul className="mt-5 space-y-3">
                    {audience.points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-sm leading-6 text-[var(--industrial-text-muted)]">
                        <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[var(--industrial-accent)] shadow-industrial-glow" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </IndustrialPanel>
              );
            })}
          </div>
        </section>

        <section id="testimonials" className="space-y-8">
          <div className="space-y-4 text-center">
            <SectionLabel className="mx-auto w-fit">Field reports</SectionLabel>
            <h2 className="industrial-embossed text-4xl font-bold tracking-tight text-[var(--industrial-text)] md:text-5xl">
              Real members, actual signal.
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((item, index) => (
              <IndustrialPanel
                key={item.name}
                elevated
                className={`p-6 pt-10 ${index === 1 ? "md:translate-y-4 md:rotate-[1deg]" : ""} ${
                  index === 2 ? "md:-rotate-[1deg]" : ""
                }`}
              >
                <span className="industrial-pin" aria-hidden="true" />
                <p className="text-base leading-7 text-[var(--industrial-text-muted)]">"{item.quote}"</p>
                <div className="mt-6 inline-flex skew-x-[-10deg] rounded-md bg-[rgba(255,230,0,0.25)] px-3 py-2 shadow-[4px_4px_8px_rgba(0,0,0,0.08)] backdrop-blur-sm">
                  <span className="skew-x-[10deg] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--industrial-text)]">
                    {item.name}
                  </span>
                </div>
              </IndustrialPanel>
            ))}
          </div>
        </section>

        <section>
          <IndustrialPanel elevated className="px-6 py-8 md:px-10 md:py-10">
            <span className="industrial-tag-hole" aria-hidden="true" />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="space-y-4">
                <SectionLabel accent className="w-fit">
                  Final call
                </SectionLabel>
                <h2 className="industrial-embossed max-w-[16ch] text-4xl font-bold tracking-tight text-[var(--industrial-text)] md:text-5xl">
                  Join the network that feels built to last.
                </h2>
                <p className="max-w-2xl text-lg leading-8 text-[var(--industrial-text-muted)]">
                  Whether you are looking for mentors, peers, internships, or a way to give back, BridgeAZ keeps the
                  connection tactile, clear, and credible.
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row lg:flex-col">
                <IndustrialButton as={Link} to="/join" variant="primary" size="lg">
                  Start your profile
                </IndustrialButton>
                <IndustrialButton as={Link} to="/contact" variant="secondary" size="lg">
                  Contact the team
                </IndustrialButton>
              </div>
            </div>
          </IndustrialPanel>
        </section>
      </div>
    </div>
  );
}

function IconBase({ className = "", children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

function OrbitIcon({ className }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M4 12c2.5-5.5 13.5-5.5 16 0" />
      <path d="M5.5 16c3.5 3 9.5 3 13 0" />
    </IconBase>
  );
}

function BriefcaseIcon({ className }) {
  return (
    <IconBase className={className}>
      <rect x="4.5" y="7.5" width="15" height="10" rx="2" />
      <path d="M9 7V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1" />
      <path d="M4.5 12h15" />
    </IconBase>
  );
}

function SparkIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    </IconBase>
  );
}
