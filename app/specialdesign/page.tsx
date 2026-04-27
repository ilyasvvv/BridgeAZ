"use client";

import { useRef, useState } from "react";

export default function SpecialDesign() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  const start = async () => {
    setStarted(true);

    setTimeout(async () => {
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = 1;
        await videoRef.current.play();
      }
    }, 100);
  };

  if (started) {
    return (
      <div className="w-screen h-screen bg-black overflow-hidden">
        <video
          ref={videoRef}
          src="/specialdesign/rickroll.mp4"
          className="w-full h-full object-cover"
          autoPlay
          playsInline
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-black overflow-hidden">
      <section className="relative min-h-screen flex items-center px-10 md:px-20">
        <div className="absolute -top-[420px] -left-[220px] w-[1100px] h-[1100px] rounded-full border border-black/10" />

        <div className="relative z-10 max-w-[620px]">
          <h1 className="text-[70px] md:text-[120px] leading-[0.95] font-black tracking-tight">
            Find your
            <br />
            <span className="font-light italic">circle</span>
            <br />
            abroad.
          </h1>

          <p className="mt-12 text-lg md:text-xl text-black/55 leading-relaxed max-w-[560px]">
            A place for Azerbaijanis abroad to meet individuals, join local
            communities, and find mentors who know the path.
          </p>

          <div className="mt-10 flex gap-3 flex-wrap">
            <span className="px-6 py-4 rounded-full bg-white border border-black/10 shadow-sm font-semibold">
              People
            </span>
            <span className="px-6 py-4 rounded-full bg-white border border-black/10 shadow-sm font-semibold">
              Circles
            </span>
            <span className="px-6 py-4 rounded-full bg-white border border-black/10 shadow-sm font-semibold">
              Mentors
            </span>
          </div>

          <div className="mt-12 flex gap-4 flex-wrap">
            <button
              onClick={start}
              className="px-10 py-5 rounded-full bg-lime-300 text-black font-bold text-lg hover:scale-105 transition"
            >
              Register →
            </button>

            <button className="px-10 py-5 rounded-full bg-white border border-black/20 font-bold text-lg">
              See how it works
            </button>
          </div>
        </div>

        <div className="hidden lg:flex absolute right-[12%] top-1/2 -translate-y-1/2 items-center justify-center">
          <div className="w-[390px] h-[390px] rounded-full bg-white shadow-2xl flex items-center justify-center">
            <div className="w-[300px] h-[300px] rounded-full bg-lime-300 border-[8px] border-black flex items-center justify-center">
              <div className="flex gap-5 -translate-y-8">
                <div className="w-9 h-9 bg-black rounded-full" />
                <div className="w-9 h-9 bg-black rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}