"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { CITY_OPTIONS, cityLabel, citySearchText, type CityOption } from "@/lib/cities";
import { Icon } from "./Icon";

type CityComboboxProps = {
  selected: CityOption | null;
  onSelect: (city: CityOption | null) => void;
  label?: string;
  placeholder?: string;
};

export function CityCombobox({
  selected,
  onSelect,
  label = "City tag",
  placeholder = "Type your city",
}: CityComboboxProps) {
  const [query, setQuery] = useState(selected ? cityLabel(selected) : "");
  const [open, setOpen] = useState(false);
  const [remoteCities, setRemoteCities] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedLabel = selected ? cityLabel(selected) : "";

  useEffect(() => {
    setQuery(selectedLabel);
  }, [selected?.value]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length < 1 || selectedLabel === trimmed) {
      setRemoteCities([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cities?q=${encodeURIComponent(trimmed)}&limit=12`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("City search failed");
        const payload = (await res.json()) as { cities?: CityOption[] };
        setRemoteCities(payload.cities || []);
      } catch (error: any) {
        if (error?.name !== "AbortError") setRemoteCities([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 140);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, selectedLabel]);

  const localCities = useMemo(() => {
    const normalized = normalizeQuery(query);
    if (!normalized) return CITY_OPTIONS.slice(0, 10);
    return CITY_OPTIONS
      .filter((city) => citySearchText(city).includes(normalized))
      .slice(0, 10);
  }, [query]);

  const visibleCities = mergeCities(query.trim() ? remoteCities : localCities, localCities).slice(0, 12);

  return (
    <div
      className="relative"
      onBlur={() => {
        window.setTimeout(() => setOpen(false), 120);
      }}
    >
      <label className="block">
        <span className="text-[11px] font-semibold tracking-[0.14em] text-ink/50 uppercase">{label}</span>
        <span className="mt-1.5 flex h-12 items-center gap-2 rounded-pill border border-paper-line bg-paper px-4 text-[14px] transition focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/[0.04]">
          <Icon.Search size={14} className="shrink-0 text-ink/42" />
          <input
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              if (selected) onSelect(null);
            }}
            placeholder={placeholder}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink/35"
          />
          {selected && (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#C1FF72] text-ink">
              <Icon.Check size={12} />
            </span>
          )}
        </span>
      </label>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-[18px] border border-paper-line bg-paper shadow-pop">
          <div className="max-h-[260px] overflow-y-auto p-1.5 scroll-clean">
            {visibleCities.map((city) => (
              <button
                key={`${city.value}-${cityLabel(city)}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(city);
                  setQuery(cityLabel(city));
                  setOpen(false);
                }}
                className={clsx(
                  "btn-press flex w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2 text-left transition hover:bg-paper-cool",
                  selected?.value === city.value && "bg-[#F0FFD4]"
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{city.city}</span>
                  <span className="block truncate text-[11.5px] text-ink/50">
                    {[city.region, city.country].filter(Boolean).join(", ")}
                  </span>
                </span>
                {selected?.value === city.value && <Icon.Check size={13} className="shrink-0 text-ink/60" />}
              </button>
            ))}

            {loading && (
              <div className="px-3 py-2 text-[12px] text-ink/45">Searching...</div>
            )}

            {!loading && query.trim() && visibleCities.length === 0 && (
              <div className="px-3 py-2 text-[12px] text-ink/45">No listed cities found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function mergeCities(primary: CityOption[], fallback: CityOption[]): CityOption[] {
  const seen = new Set<string>();
  const merged: CityOption[] = [];
  [...primary, ...fallback].forEach((city) => {
    const key = `${city.city}-${city.region || ""}-${city.country}`.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(city);
  });
  return merged;
}

function normalizeQuery(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
