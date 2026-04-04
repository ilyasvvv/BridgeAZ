// Qovshaq Phase 3B — Community guidelines
import QCard from "../components/QCard";

const guidelines = [
  {
    icon: "\u{1F91D}",
    title: "Be Respectful",
    body: "Treat everyone with dignity. No harassment, bullying, or hate speech of any kind.",
  },
  {
    icon: "\u{1F30D}",
    title: "Celebrate Diversity",
    body: "Our community spans the globe. Embrace different perspectives, languages, and experiences.",
  },
  {
    icon: "\u{1F6E1}\uFE0F",
    title: "Keep It Safe",
    body: "Don't share personal information about others. Protect your own privacy and respect others'.",
  },
  {
    icon: "\u2728",
    title: "Share Authentically",
    body: "Post genuine content. No spam, scams, or misleading information.",
  },
  {
    icon: "\u{1F4AC}",
    title: "Constructive Discussions",
    body: "Disagree respectfully. Focus on ideas, not personal attacks.",
  },
  {
    icon: "\u{1F6A9}",
    title: "Report Concerns",
    body: "If you see something that violates these guidelines, use the report feature. We review every report.",
  },
];

export default function QGuidelines() {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="font-q-display text-3xl text-q-text mb-3">Community Guidelines</h1>
        <p className="text-q-text-muted text-sm max-w-md mx-auto">
          Qovshaq is a gathering place for the Azerbaijani diaspora. These guidelines
          help us keep it warm, safe, and welcoming for everyone.
        </p>
      </div>

      <div className="space-y-4">
        {guidelines.map((g) => (
          <QCard key={g.title} className="p-5 flex gap-4">
            <span className="text-2xl flex-shrink-0">{g.icon}</span>
            <div>
              <h3 className="font-q-display text-lg text-q-text mb-1">{g.title}</h3>
              <p className="text-sm text-q-text-muted leading-relaxed">{g.body}</p>
            </div>
          </QCard>
        ))}
      </div>
    </div>
  );
}
