"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { SearchOverlay } from "./SearchOverlay";

const COUNTRIES = [
  "Global",
  "Germany",
  "United States",
  "United Kingdom",
  "UAE",
  "Canada",
  "France",
  "Türkiye",
  "Netherlands",
  "Sweden",
];

export function TopBar({ country = "Germany" }: { country?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(country);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("q") ?? "";
    setSearchDraft(next);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-xl border-b border-paper-line">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center gap-5">
        {/* Logo lockup with country picker between 'bizim' and 'circle' */}
        <Link href="/home" className="flex items-center gap-2.5 shrink-0 group">
          <span className="relative inline-flex items-center justify-center rounded-full bg-ink text-paper w-7 h-7">
            <span className="absolute inset-[4px] rounded-full border border-paper/50" />
            <span className="relative text-[10px] font-black">b</span>
          </span>
          <span className="font-display text-[16px] font-semibold tracking-[-0.02em]">bizim</span>
        </Link>

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className={clsx(
              "group inline-flex items-center gap-1.5 h-9 pl-3 pr-2.5 rounded-pill border text-[12px] font-semibold tracking-tight",
              "bg-paper hover:border-ink/40 transition-colors",
              open ? "border-ink/40" : "border-paper-line"
            )}
          >
            <Icon.Globe size={13} className="text-ink/60" />
            {selected}
            <svg width="10" height="10" viewBox="0 0 10 10" className={clsx("transition-transform", open && "rotate-180")}>
              <path d="m2 3.5 3 3 3-3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </svg>
          </button>
          {open && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <div className="absolute left-0 top-full mt-2 w-56 bg-paper rounded-[18px] border border-paper-line shadow-pop p-1.5 z-50 max-h-80 overflow-auto scroll-clean">
                {COUNTRIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setSelected(c);
                      setOpen(false);
                    }}
                    className={clsx(
                      "w-full flex items-center justify-between px-3 h-9 rounded-pill text-[13px] text-left hover:bg-paper-cool",
                      c === selected && "bg-paper-cool font-semibold"
                    )}
                  >
                    {c}
                    {c === selected && <Icon.Check size={14} className="text-ink" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <Link href="/home" className="font-display text-[16px] font-light tracking-[-0.02em] text-ink/60 -ml-2">
          circle
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-xl">
          <div className="group relative flex items-center h-10 rounded-pill bg-paper-cool hover:bg-paper focus-within:bg-paper border border-transparent hover:border-paper-line focus-within:border-ink/30 focus-within:shadow-soft transition">
            <Icon.Search size={15} className="ml-3.5 text-ink/50" />
            <input
              value={searchDraft}
              onFocus={() => setSearchOpen(true)}
              onChange={(event) => {
                setSearchDraft(event.target.value);
                setSearchOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;

                event.preventDefault();
                const params = new URLSearchParams();
                if (searchDraft.trim()) params.set("q", searchDraft.trim());
                router.push(params.toString() ? `/search?${params.toString()}` : "/search");
              }}
              placeholder="Search people, circles, posts, tags…"
              className="flex-1 bg-transparent px-3 text-[13.5px] outline-none placeholder:text-ink/40"
              spellCheck={false}
            />
            <span className="mr-2 inline-flex items-center gap-1 text-[10.5px] text-ink/45 font-semibold">
              <kbd className="px-1.5 h-5 inline-flex items-center rounded border border-paper-line bg-paper/90">⌘K</kbd>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/messages"
            className="relative w-10 h-10 rounded-full border border-paper-line bg-paper hover:border-ink/30 flex items-center justify-center btn-press"
            aria-label="Messages"
          >
            <Icon.Chat size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-ink" />
          </Link>
          <Link
            href="/notifications"
            className="relative w-10 h-10 rounded-full border border-paper-line bg-paper hover:border-ink/30 flex items-center justify-center btn-press"
          >
            <Icon.Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-ink" />
          </Link>
          <Link
            href="/profile"
            className="w-10 h-10 rounded-full border border-paper-line bg-paper overflow-hidden btn-press hover:border-ink/30 flex items-center justify-center"
          >
            <Icon.User size={15} />
          </Link>
          <Link
            href="/"
            className="btn-press inline-flex items-center gap-1.5 h-10 px-4 rounded-pill border border-paper-line text-[12px] font-semibold hover:border-ink/40"
          >
            <Icon.SignOut size={14} />
            Sign out
          </Link>
        </div>
      </div>
      <SearchOverlay
        open={searchOpen}
        initialQuery={searchDraft}
        onClose={(value) => {
          setSearchDraft(value ?? "");
          setSearchOpen(false);
        }}
      />
    </header>
  );
}
