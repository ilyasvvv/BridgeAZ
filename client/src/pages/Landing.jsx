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

const footerLinks = {
  platform: [
    { label: "For Students", href: "/join" },
    { label: "For Professionals", href: "/join" },
    { label: "Mentorship", href: "/join" },
    { label: "Opportunities", href: "/join" },
  ],
  company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Press", href: "#" },
  ],
  support: [
    { label: "Contact", href: "/contact" },
    { label: "Help Center", href: "#" },
    { label: "Community Guidelines", href: "#" },
    { label: "Report an Issue", href: "#" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

export default function Landing() {
  return (
    <div className="flex flex-col gap-16">
      {/* ─── Sticky minimal landing header ─── */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 md:px-12">
          <Link to="/" className="font-display text-2xl text-sand">
            BridgeAZ
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-[13px] font-medium uppercase tracking-widest text-mist transition-colors hover:text-sand"
            >
              Log in
            </Link>
            <Link
              to="/join"
              className="rounded-full border border-coral/30 bg-coral/8 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-coral/90 transition-all duration-300 hover:bg-coral/15 hover:border-coral/50"
            >
              Join
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-[1.2fr_0.8fr] md:items-center md:px-12">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-[0.4em] text-accent">Connecting Azerbaijanis Worldwide</p>
          <h1 className="font-display text-4xl md:text-5xl">
            BridgeAZ is a global community for Azerbaijanis.
          </h1>
          <p className="text-base text-mist">
            Students and professionals connect here for mentorship, opportunities, and collaboration—without the noise.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/join"
              className="group relative rounded-full border border-coral/30 bg-coral/8 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-coral/90 transition-all duration-300 hover:-translate-y-0.5 hover:border-coral/50 hover:bg-coral/15 hover:shadow-md"
            >
              Join as Student
              <span className="absolute inset-x-6 -bottom-px h-px origin-left scale-x-0 bg-coral/40 transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
            <Link
              to="/join"
              className="group relative rounded-full border border-border px-6 py-3 text-sm font-semibold uppercase tracking-wide text-sand transition-all duration-300 hover:-translate-y-0.5 hover:border-sand/40 hover:shadow-md"
            >
              Join as Professional
              <span className="absolute inset-x-6 -bottom-px h-px origin-left scale-x-0 bg-sand/30 transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
          </div>
        </div>
        <div className="glass rounded-3xl p-6 shadow-elevated ring-1 ring-white/30">
          <h2 className="font-display text-2xl">Why BridgeAZ?</h2>
          <ul className="mt-4 space-y-3 text-sm text-mist">
            <li>Mentorship that actually feels human.</li>
            <li>Community matches across locations worldwide.</li>
            <li>Verified profiles for higher trust.</li>
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 md:px-12">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-accent">By the numbers</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Our growing impact</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass group cursor-default rounded-2xl p-6 ring-1 ring-white/20 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1.5 hover:shadow-floating hover:ring-white/40"
            >
              <p className="text-3xl font-semibold text-sand transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110 group-hover:text-accent">
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-mist">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Globe Section */}
      <section className="relative overflow-hidden bg-[#0B0B1A] px-6 py-16 md:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,rgba(29,29,68,0.2)_0%,transparent_55%)]" />
        <div className="relative z-[2] mx-auto max-w-xl text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-accent/70">Global network</p>
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
            <div
              key={item.label}
              className="group cursor-default rounded-xl px-6 py-3 text-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:bg-white/5 hover:shadow-[0_2px_8px_rgba(29,29,68,0.12),0_8px_24px_rgba(29,29,68,0.18),inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              <p className="font-display text-3xl font-semibold text-white transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110">
                {item.value}
              </p>
              <p className="mt-1 text-xs uppercase tracking-widest text-white/40 transition-colors duration-300 group-hover:text-white/70">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 md:px-12">
        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-accent">Why join BridgeAZ</p>
          <h2 className="mt-2 font-display text-3xl md:text-4xl">Built for every stage of your journey</h2>
        </div>
        <div className="grid gap-10 md:grid-cols-2">
        <div className="glass rounded-2xl p-6 shadow-elevated ring-1 ring-white/20 transition-all duration-300 hover:shadow-floating hover:ring-white/35">
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
        <div className="glass rounded-2xl p-6 shadow-elevated ring-1 ring-white/20 transition-all duration-300 hover:shadow-floating hover:ring-white/35">
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
        </div>
      </section>

      {/* ─── Testimonials with gradient background ─── */}
      <section className="relative overflow-hidden py-20"
        style={{ background: "linear-gradient(135deg, #E8EEF4 0%, #F0F2F5 35%, #F5EDE8 70%, #F0F2F5 100%)" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(29,29,68,0.06)_0%,transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_100%,rgba(95,96,116,0.06)_0%,transparent_50%)]" />
        <div className="relative mx-auto max-w-6xl px-6 md:px-12">
          <div className="mb-10 text-center">
            <p className="text-sm uppercase tracking-[0.4em] text-accent">What our members are saying</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">Stories from the community</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((item) => (
            <div key={item.name} className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-elevated ring-1 ring-white/30 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-glow hover:ring-accent/10">
              <p className="text-sm leading-relaxed text-mist">"{item.quote}"</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent">{item.name}</p>
            </div>
          ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/60 bg-white/40 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-12">
          {/* Link columns */}
          <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-sand">Platform</h4>
              <ul className="mt-4 space-y-3">
                {footerLinks.platform.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-mist transition-colors hover:text-accent">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-sand">Company</h4>
              <ul className="mt-4 space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-mist transition-colors hover:text-accent">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-sand">Support</h4>
              <ul className="mt-4 space-y-3">
                {footerLinks.support.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-mist transition-colors hover:text-accent">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-sand">Legal</h4>
              <ul className="mt-4 space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-mist transition-colors hover:text-accent">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="mt-14 border-t border-border/60 pt-8">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div>
                <Link to="/" className="font-display text-xl text-sand">BridgeAZ</Link>
                <p className="mt-1 text-xs text-mist">Connecting Azerbaijanis worldwide.</p>
              </div>
              <div className="flex items-center gap-6">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-mist transition-colors hover:text-accent" aria-label="Twitter">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-mist transition-colors hover:text-accent" aria-label="LinkedIn">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-mist transition-colors hover:text-accent" aria-label="Instagram">
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              </div>
              <p className="text-xs text-mist/60">&copy; {new Date().getFullYear()} BridgeAZ. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
