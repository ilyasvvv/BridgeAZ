import { Link } from "react-router-dom";
import Globe from "../components/Globe";

const stats = [
  { label: "Members worldwide", value: "3,500+" },
  { label: "Mentorship matches", value: "420" },
  { label: "Community projects launched", value: "96" }
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

const globeStats = [
  { value: "2,400+", label: "Members" },
  { value: "45+", label: "Countries" },
  { value: "180+", label: "Mentors" }
];

export default function Landing() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16">
      <section className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.4em] text-teal">Connecting Azerbaijanis Worldwide</p>
          <h1 className="font-display text-4xl md:text-5xl">
            BridgeAZ is a global community for Azerbaijanis.
          </h1>
          <p className="text-base text-mist">
            Students and professionals connect here for mentorship, opportunities, and collaboration—without the noise.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/join"
              className="rounded-full bg-coral px-6 py-3 text-sm font-semibold uppercase tracking-wide text-charcoal"
            >
              Join as Student
            </Link>
            <Link
              to="/join"
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold uppercase tracking-wide text-sand hover:border-teal"
            >
              Join as Professional
            </Link>
          </div>
        </div>
        <div className="glass gradient-border rounded-3xl p-6">
          <h2 className="font-display text-2xl">Why BridgeAZ?</h2>
          <ul className="mt-4 space-y-3 text-sm text-mist">
            <li>Mentorship that actually feels human.</li>
            <li>Community matches across locations worldwide.</li>
            <li>Verified profiles for higher trust.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-6">
            <p className="text-3xl font-semibold text-sand">{stat.value}</p>
            <p className="mt-2 text-sm text-mist">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Interactive Globe Section */}
      <section className="relative -mx-6 overflow-hidden rounded-3xl bg-[#0B1628] px-6 py-16 md:-mx-12 md:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,rgba(21,101,163,0.08)_0%,transparent_60%)]" />
        <div className="relative z-[2] mx-auto max-w-xl text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-teal/70">Global network</p>
          <h2 className="mt-3 font-display text-3xl text-white md:text-4xl">
            Azerbaijanis, everywhere
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/45">
            Our members span across the globe. Drag to explore where the community lives.
          </p>
        </div>
        <div className="relative z-[1] mt-10">
          <Globe />
        </div>
        <div className="relative z-[2] mt-10 flex flex-wrap justify-center gap-14">
          {globeStats.map((item) => (
            <div key={item.label} className="text-center">
              <p className="font-display text-3xl font-semibold text-white">{item.value}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-white/40">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-10 md:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display text-2xl">For Students</h3>
          <p className="mt-3 text-sm text-mist">
            Find mentors, share progress, and unlock internships from anywhere.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-mist">
            <li>Discover verified mentors in your field.</li>
            <li>Share project updates and get feedback.</li>
            <li>Connect with peers across campuses.</li>
          </ul>
        </div>
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display text-2xl">For Professionals</h3>
          <p className="mt-3 text-sm text-mist">
            Give back to the next generation and build relationships with emerging talent.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-mist">
            <li>Mentor students who remind you of yourself.</li>
            <li>Surface internships and projects from your team.</li>
            <li>Stay connected to the community network.</li>
          </ul>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {testimonials.map((item) => (
          <div key={item.name} className="glass rounded-2xl p-6">
            <p className="text-sm text-mist">"{item.quote}"</p>
            <p className="mt-4 text-xs uppercase tracking-wide text-teal">{item.name}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
