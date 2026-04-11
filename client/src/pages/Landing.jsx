import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";

/* ─── Data ─── */
const features = [
  { icon: "👥", title: "Connect", desc: "Find and connect with Azerbaijanis living in your city or anywhere around the world." },
  { icon: "💬", title: "Chat", desc: "Stay in touch with real-time messaging and share moments with your community." },
  { icon: "🌐", title: "Create Circles", desc: "Build and join communities based on your interests, location, or background." },
  { icon: "📢", title: "Share & Discover", desc: "Post updates, share experiences, and discover what's trending in your community." },
];

const testimonials = [
  { name: "Leyla Mammadova", city: "Berlin, Germany", quote: "Finally found my people! I moved to Berlin 2 years ago and bizim circle helped me connect with amazing Azerbaijanis here. We even started a weekend football circle!", likes: 234 },
  { name: "Rashad Aliyev", city: "London, UK", quote: "As a student abroad, this platform made me feel less homesick. The London Azerbaijanis circle organizes meetups and cultural events. It's like having a piece of home here.", likes: 188 },
  { name: "Nigar Huseyova", city: "New York, USA", quote: "I just started my career in NYC and was looking for networking opportunities. Through bizim circle, I connected with Azerbaijani professionals who gave me invaluable advice!", likes: 312 },
  { name: "Elvin Kazimov", city: "Dubai, UAE", quote: "Living in Dubai, I wanted to celebrate Novruz with fellow Azerbaijanis. Found an amazing group through this platform and had the best celebration!", likes: 276 },
  { name: "Aysel Jabbarova", city: "Toronto, Canada", quote: "My kids were losing touch with their Azerbaijani roots. Thanks to the families circle, they now have Azerbaijani friends and are learning the language together!", likes: 421 },
  { name: "Farid Mustafayev", city: "Paris, France", quote: "Needed advice on starting a business in France. Connected with Azerbaijani entrepreneurs who shared their experiences. This community is pure gold!", likes: 198 },
];

const stats = [
  { value: "10K+", label: "Active Members" },
  { value: "50+", label: "Countries" },
  { value: "500+", label: "Active Circles" },
];

/* ─── Animated circular hero graphic ─── */
function CircularHero() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const size = 420;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    const cx = size / 2;
    const cy = size / 2;

    let rotation = 0;
    let frame;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // Outer circle border (thick)
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 190, 0, Math.PI * 2);
      ctx.stroke();

      // Concentric rings
      [140, 110, 80].forEach((r, i) => {
        ctx.strokeStyle = `rgba(0,0,0,${0.06 + i * 0.02})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Orbiting people dots on middle ring
      const orbitR = 140;
      const count = 8;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + rotation;
        const x = cx + Math.cos(a) * orbitR;
        const y = cy + Math.sin(a) * orbitR;

        // Small circle (person head)
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Ring around person
        ctx.strokeStyle = "rgba(0,0,0,0.12)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Center: "iii" logo
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.font = "bold 48px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("iii", cx, cy);

      rotation += 0.003;
      frame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className="w-full max-w-[420px]" />;
}

/* ─── Page ─── */
export default function Landing() {
  return (
    <div className="flex flex-col">
      {/* ─── Header ─── */}
      <header className="border-b border-grey-300 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-12">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full border-2 border-sand flex items-center justify-center">
              <span className="text-sand text-xs font-bold tracking-tight">iii</span>
            </div>
            <span className="font-display text-lg text-sand">bizim circle</span>
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-grey-400 px-5 py-2 text-sm font-medium text-sand hover:bg-grey-100 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-6 md:px-12 grid md:grid-cols-2 gap-16 items-center">
          {/* LEFT: Circular graphic */}
          <div className="flex justify-center md:justify-start">
            <CircularHero />
          </div>

          {/* RIGHT: Text */}
          <div className="space-y-8">
            <h1 className="font-display text-5xl md:text-6xl leading-[1.1] text-sand">
              Azerbaijanis abroad,<br />
              <span className="text-grey-500">united in<br />one circle</span>
            </h1>
            <p className="text-lg text-mist leading-relaxed max-w-md">
              Connect, share, and build communities with fellow Azerbaijanis around the world
            </p>
            <div>
              <Link to="/join" className="circular-btn inline-block text-base px-8 py-3.5">
                Join bizim circle
              </Link>
              <p className="text-xs text-mist mt-3">Free to join &middot; No credit card required</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section className="py-20 bg-charcoal">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <h2 className="font-display text-3xl md:text-4xl text-center text-sand mb-14">
            Everything you need to stay connected
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <div key={i} className="circular-card p-7 text-center group">
                <div className="w-16 h-16 rounded-full bg-grey-200 flex items-center justify-center mx-auto mb-5 text-2xl group-hover:scale-110 transition-transform duration-300">
                  {f.icon}
                </div>
                <h3 className="font-display text-lg font-semibold text-sand mb-2">{f.title}</h3>
                <p className="text-sm text-mist leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <h2 className="font-display text-3xl md:text-4xl text-center text-sand mb-3">
            What our community is saying
          </h2>
          <p className="text-center text-mist mb-14">Real stories from Azerbaijanis around the world</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={i} className="circular-card p-6 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-grey-300 to-grey-400 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-white">{t.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-sand">{t.name}</p>
                    <p className="text-xs text-mist">{t.city}</p>
                  </div>
                </div>
                <p className="text-sm text-mist leading-relaxed flex-1">"{t.quote}"</p>
                <p className="mt-4 text-xs text-mist">
                  <span className="text-red-400">&#9829;</span> {t.likes} likes
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="py-20 bg-sand text-white">
        <div className="mx-auto max-w-6xl px-6 md:px-12 text-center">
          <h2 className="font-display text-3xl md:text-4xl mb-4">
            Join thousands of Azerbaijanis worldwide
          </h2>
          <p className="text-grey-500 mb-14 max-w-2xl mx-auto">
            From Berlin to New York, from London to Dubai — we're building the largest community of Azerbaijanis abroad
          </p>
          <div className="grid gap-8 sm:grid-cols-3">
            {stats.map((s, i) => (
              <div key={i}>
                <p className="font-display text-5xl md:text-6xl font-bold">{s.value}</p>
                <p className="text-grey-500 mt-2">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 bg-white text-center">
        <h2 className="font-display text-3xl md:text-4xl text-sand mb-4">
          Ready to join your circle?
        </h2>
        <p className="text-mist mb-8">Start connecting with fellow Azerbaijanis today</p>
        <Link to="/join" className="circular-btn inline-block text-base px-8 py-3.5">
          Join bizim circle
        </Link>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-grey-300 bg-white py-10">
        <div className="mx-auto max-w-6xl px-6 md:px-12 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full border-2 border-sand flex items-center justify-center">
              <span className="text-sand text-[10px] font-bold">iii</span>
            </div>
            <span className="font-display text-sm text-sand">bizim circle</span>
          </div>
          <p className="text-xs text-mist">&copy; {new Date().getFullYear()} bizim circle. Connecting Azerbaijanis worldwide.</p>
        </div>
      </footer>
    </div>
  );
}
