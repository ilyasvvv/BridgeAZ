import { BizimLogoLockup } from "@/components/AnimatedLogo";

export default function LogoPreviewPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <div className="min-h-screen flex items-center justify-center px-8">
        <div className="w-full max-w-[980px]">
          <div className="min-h-[420px] rounded-[18px] border border-paper-line bg-white flex items-center justify-center overflow-hidden">
            <BizimLogoLockup size={180} motion="side-to-side" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[14px] border border-paper-line bg-paper-warm p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/45">
                Source
              </div>
              <div className="mt-2 text-[13px] font-semibold">
                Canva slide 10
              </div>
            </div>
            <div className="rounded-[14px] border border-paper-line bg-paper-warm p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/45">
                Lime
              </div>
              <div className="mt-2 font-mono text-[13px]">#C1FF72</div>
            </div>
            <div className="rounded-[14px] border border-paper-line bg-paper-warm p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/45">
                Motion
              </div>
              <div className="mt-2 text-[13px] font-semibold">Side to side</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
