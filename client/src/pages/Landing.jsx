import { Link } from "react-router-dom";

const stats = [
  { label: "Members across AZ/TR/US", value: "3,500+" },
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

export default function Landing() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-16">
      <section className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.4em] text-teal">Azerbaijani diaspora network</p>
          <h1 className="font-display text-4xl md:text-5xl">
            BridgeAZ connects Azerbaijani students and professionals across Azerbaijan, Turkey,
            and the United States.
          </h1>
          <p className="text-base text-mist">
            A warm, community-driven professional network built for mentorship, collaboration, and
            opportunity-sharing. Think alumni energy, not corporate noise.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/register"
              className="rounded-full bg-coral px-6 py-3 text-sm font-semibold uppercase tracking-wide text-charcoal"
            >
              Join as Student
            </Link>
            <Link
              to="/register"
              className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-sand hover:border-teal"
            >
              Join as Professional
            </Link>
          </div>
        </div>
        <div className="glass gradient-border rounded-3xl p-6">
          <h2 className="font-display text-2xl">Why BridgeAZ?</h2>
          <ul className="mt-4 space-y-3 text-sm text-mist">
            <li>Mentorship that actually feels human.</li>
            <li>Region-aware community matches across AZ, TR, and US.</li>
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

      <section className="grid gap-10 md:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display text-2xl">For Students</h3>
          <p className="mt-3 text-sm text-mist">
            Find alumni mentors, share progress, and unlock internships in your region.
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
            <li>Stay connected to the diaspora network.</li>
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
