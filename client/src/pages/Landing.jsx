import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

const stats = [
  { label: "Active Members", value: "10K+" },
  { label: "Countries Connected", value: "50+" },
  { label: "Active Circles", value: "500+" }
];

const features = [
  {
    icon: "👥",
    title: "Connect",
    description: "Find and connect with Azerbaijanis living in your city or anywhere around the world."
  },
  {
    icon: "💬",
    title: "Chat",
    description: "Stay in touch with real-time messaging and share moments with your community."
  },
  {
    icon: "🔵",
    title: "Create Circles",
    description: "Build and join communities based on your interests, hobbies, or background."
  },
  {
    icon: "📢",
    title: "Share & Discover",
    description: "Post updates, share experiences, and discover what's trending in your circle."
  }
];

const testimonials = [
  {
    name: "Leyla Mammadova",
    role: "Product Designer in Berlin",
    quote: "Finally found my people! I moved abroad and felt isolated, but Bizim Circle connected me with amazing Azerbaijanis here."
  },
  {
    name: "Rashad Aliyev",
    role: "Student in London",
    quote: "The communities here are so welcoming. I've made friends, found mentors, and even met business partners."
  },
  {
    name: "Nigar Hasymova",
    role: "Founder in NYC",
    quote: "I just started my career in NYC and was looking for mentors. Connected with Azerbaijanis here, invaluable advice!"
  },
  {
    name: "Elvin Karimov",
    role: "Engineer in Dubai",
    description: "Living in Dubai, I wanted to celebrate Novruz with fellow Azerbaijanis. Found an amazing group through this platform!"
  },
  {
    name: "Aysel Jafarova",
    role: "Artist in Paris",
    quote: "My wife and I were loving time with their families circle. They have introduced us to beautiful Azerbaijani friends and learning."
  },
  {
    name: "Farid Mustafayev",
    role: "Entrepreneur in Germany",
    quote: "Headed advice on starting a business in Europe. Connected with Azerbaijanis here who shared their entrepreneurship."
  }
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

// Circular hero graphic component with animated rings
function CircularHeroGraphic() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRadius = 80;

    let animationFrame;
    let rotation = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw concentric rings
      for (let i = 5; i > 0; i--) {
        const radius = baseRadius + i * 15;
        const alpha = 0.2 - i * 0.03;
        ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw rotating people icons in circular pattern
      const peopleCount = 8;
      for (let i = 0; i < peopleCount; i++) {
        const angle = (i / peopleCount) * Math.PI * 2 + rotation;
        const x = centerX + Math.cos(angle) * (baseRadius + 40);
        const y = centerY + Math.sin(angle) * (baseRadius + 40);

        // Draw small circle for person
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Draw ring around person
        ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw center circle
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.beginPath();
      ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      ctx.stroke();

      rotation += 0.005;
      animationFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={300}
      className="w-full max-w-xs mx-auto"
    />
  );
}

export default function Landing() {
  return (
    <div className="flex flex-col gap-20">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-20 border-b border-grey-300 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-12">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sand flex items-center justify-center">
              <span className="text-white text-sm font-bold">◯</span>
            </div>
            <span className="font-display text-xl font-bold text-sand">Bizim Circle</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-mist transition-colors hover:text-sand"
            >
              Sign In
            </Link>
            <Link
              to="/join"
              className="circular-btn text-xs px-5 py-2"
            >
              Join
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 md:grid-cols-2 md:items-center md:px-12">
        <div className="space-y-8 animate-slide-up">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-mist mb-3">Azerbaijanis Abroad</p>
            <h1 className="font-display text-5xl md:text-6xl leading-tight text-sand">
              United in one <span className="relative inline-block">
                circle
                <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 100 8">
                  <path d="M 0 4 Q 25 1 50 4 T 100 4" stroke="currentColor" fill="none" strokeWidth="1.5" opacity="0.5" />
                </svg>
              </span>
            </h1>
          </div>
          <p className="text-lg text-mist leading-relaxed">
            Connect, share, and build communities with fellow Azerbaijanis around the world. From Berlin to New York, from London to Dubai—find your circle.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              to="/join"
              className="circular-btn"
            >
              Join Bizim Circle
            </Link>
            <Link
              to="/join"
              className="circular-btn-outline"
            >
              Learn More
            </Link>
          </div>
          <p className="text-xs text-mist">✓ Free to join  ✓ No credit card required</p>
        </div>

        {/* Circular Hero Graphic */}
        <div className="flex justify-center md:justify-end animate-scale-in" style={{ animationDelay: "200ms" }}>
          <div className="w-full max-w-sm">
            <CircularHeroGraphic />
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="mx-auto max-w-6xl px-6 md:px-12">
        <div className="mb-12 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-mist mb-3">Everything You Need</p>
          <h2 className="font-display text-4xl text-sand">Stay Connected</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="circular-card p-6 group"
              style={{ animationDelay: `${idx * 100}ms`, animation: "slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
            >
              <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                {feature.icon}
              </div>
              <h3 className="font-display text-lg font-semibold text-sand mb-2">{feature.title}</h3>
              <p className="text-sm text-mist leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="mx-auto max-w-6xl px-6 md:px-12">
        <div className="mb-12 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-mist mb-3">Real Stories</p>
          <h2 className="font-display text-4xl text-sand">What our community is saying</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, idx) => (
            <div
              key={idx}
              className="circular-card p-6 flex flex-col"
              style={{ animationDelay: `${idx * 75}ms`, animation: "slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-grey-200 to-grey-300 flex-shrink-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-sand">
                    {testimonial.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm text-sand">{testimonial.name}</p>
                  <p className="text-xs text-mist">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-sm text-mist leading-relaxed flex-1">"{testimonial.quote || testimonial.description}"</p>
              <div className="mt-4 pt-4 border-t border-grey-300 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xs">★</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="mx-auto max-w-6xl px-6 md:px-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-grey-900 via-grey-800 to-grey-900 px-8 py-16 md:px-16 md:py-24 border border-grey-700">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, white, transparent 50%), radial-gradient(circle at 80% 80%, white, transparent 50%)"
          }} />
          <div className="relative">
            <div className="mb-12 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-grey-400 mb-3">Join thousands</p>
              <h2 className="font-display text-4xl md:text-5xl text-white mb-3">Azerbaijanis Worldwide</h2>
              <p className="text-grey-300 max-w-2xl mx-auto">
                From Berlin to New York, from London to Dubai—we're building the largest community of Azerbaijanis abroad.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center group cursor-default">
                  <div className="relative inline-block mb-3">
                    <p className="font-display text-5xl md:text-6xl font-bold text-white group-hover:scale-110 transition-transform duration-300">
                      {stat.value}
                    </p>
                  </div>
                  <p className="text-grey-300 text-sm font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="mx-auto max-w-6xl px-6 md:px-12 text-center py-12">
        <h2 className="font-display text-4xl text-sand mb-4">Ready to join your circle?</h2>
        <p className="text-mist mb-8 max-w-2xl mx-auto">
          Start connecting with fellow Azerbaijanis today. It's free and takes just a minute.
        </p>
        <Link
          to="/join"
          className="circular-btn inline-block"
        >
          Get Started Now
        </Link>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-grey-300 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-12">
          <div className="grid gap-12 sm:grid-cols-2 md:grid-cols-4 mb-12">
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-sand mb-6">
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.href} className="text-sm text-mist transition-colors hover:text-sand">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-grey-300 pt-8">
            <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
              <div>
                <Link to="/" className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-sand flex items-center justify-center">
                    <span className="text-white text-xs font-bold">◯</span>
                  </div>
                  <span className="font-display text-lg font-bold text-sand">Bizim Circle</span>
                </Link>
                <p className="text-xs text-mist">Connecting Azerbaijanis worldwide.</p>
              </div>
              <div className="flex items-center gap-6">
                {[
                  { name: "Twitter", icon: "𝕏" },
                  { name: "LinkedIn", icon: "in" },
                  { name: "Instagram", icon: "📷" },
                ].map((social) => (
                  <a
                    key={social.name}
                    href="#"
                    aria-label={social.name}
                    className="w-10 h-10 rounded-full bg-grey-200 flex items-center justify-center text-sand hover:bg-grey-300 transition-colors text-sm font-semibold"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
              <p className="text-xs text-mist/60">
                &copy; {new Date().getFullYear()} Bizim Circle. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
