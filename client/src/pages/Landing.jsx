import { Link } from "react-router-dom";

const features = [
  {
    title: "Mentorship",
    description: "Find verified Azerbaijani professionals who've been in your shoes and are ready to guide your path.",
    icon: "🤝"
  },
  {
    title: "Opportunities",
    description: "Access a curated feed of internships, jobs, and projects shared by community members worldwide.",
    icon: "💼"
  },
  {
    title: "Network",
    description: "Connect with peers across campuses and borders. Build relationships that last beyond the screen.",
    icon: "🌐"
  }
];

const stats = [
  { label: "Members", value: "3,500+" },
  { label: "Mentors", value: "420" },
  { label: "Projects", value: "96" }
];

const testimonials = [
  {
    name: "Nihad, Baku",
    quote: "BridgeAZ helped me find alumni in Turkey who guided my grad school path.",
    role: "Graduate Student"
  },
  {
    name: "Aysel, Istanbul",
    quote: "The community feels warm and approachable. It's more than just a network—it's home.",
    role: "Software Engineer"
  },
  {
    name: "Murad, New York",
    quote: "I met my mentor within a week and landed an internship in fintech. Incredible trust.",
    role: "Finance Analyst"
  }
];

export default function Landing() {
  return (
    <div className="flex flex-col gap-24 py-10 md:py-20">
      {/* Hero Section */}
      <section className="fade-in flex flex-col items-center text-center">
        <span className="mb-6 inline-block rounded-full bg-brand-blue/10 px-4 py-1 text-sm font-semibold tracking-tight text-brand-blue">
          Connecting Azerbaijanis Worldwide
        </span>
        <h1 className="max-w-4xl font-display text-5xl font-extrabold leading-[1.1] md:text-7xl">
          The professional home for our global community.
        </h1>
        <p className="mt-8 max-w-2xl text-lg text-text-secondary md:text-xl">
          BridgeAZ brings together students and professionals for mentorship, 
          career opportunities, and trusted collaboration. Built for Azerbaijanis, by Azerbaijanis.
        </p>
        <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            to="/join"
            className="apple-button-primary px-8 py-4 text-base"
          >
            Join the Community
          </Link>
          <Link
            to="/login"
            className="apple-button-secondary px-8 py-4 text-base"
          >
            Log in to your account
          </Link>
        </div>
      </section>

      {/* Stats Section */}
      <section className="fade-in grid gap-8 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-4xl font-extrabold text-brand-blue">{stat.value}</p>
            <p className="mt-2 font-medium text-text-secondary">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Features Grid */}
      <section className="fade-in flex flex-col gap-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Designed for Growth</h2>
          <p className="mt-4 text-text-secondary">Everything you need to build your professional future.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="apple-card apple-card-hover p-8">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-apple bg-bg-app text-2xl">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold">{feature.title}</h3>
              <p className="mt-4 leading-relaxed text-text-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="fade-in apple-card flex flex-col overflow-hidden md:flex-row">
        <div className="flex-1 bg-brand-blue p-10 text-white md:p-16">
          <h2 className="text-3xl font-bold text-white md:text-4xl">High Trust. No Noise.</h2>
          <p className="mt-6 text-lg text-blue-100">
            We verify every student and professional to ensure BridgeAZ remains a safe, 
            high-quality space for genuine connection.
          </p>
          <ul className="mt-10 space-y-4">
            {["Verified Student IDs", "Manual Mentor Review", "No Third-party Ads"].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs">✓</span>
                <span className="font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 bg-white p-10 md:p-16">
          <h3 className="text-2xl font-bold">Ready to give back?</h3>
          <p className="mt-4 text-text-secondary">
            Professionals can opt-in to be mentors, share internships, 
            and help the next generation of Azerbaijani talent succeed globally.
          </p>
          <div className="mt-10">
            <Link to="/join" className="font-semibold text-brand-blue hover:underline">
              Register as a Professional &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="fade-in flex flex-col gap-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Community Stories</h2>
          <p className="mt-4 text-text-secondary">Real connections happening every day on BridgeAZ.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((item) => (
            <div key={item.name} className="apple-card p-8">
              <p className="text-lg italic leading-relaxed text-text-main">"{item.quote}"</p>
              <div className="mt-8 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold">
                  {item.name[0]}
                </div>
                <div>
                  <p className="font-bold text-text-main">{item.name}</p>
                  <p className="text-sm text-text-secondary">{item.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="fade-in mb-20 flex flex-col items-center rounded-apple-lg bg-bg-surface px-10 py-20 text-center shadow-apple">
        <h2 className="text-4xl font-bold">Join BridgeAZ today.</h2>
        <p className="mt-4 max-w-xl text-lg text-text-secondary">
          Be part of the global Azerbaijani professional and student network.
        </p>
        <div className="mt-10">
          <Link to="/join" className="apple-button-primary px-10 py-4 text-lg">
            Create Free Account
          </Link>
        </div>
      </section>
    </div>
  );
}
