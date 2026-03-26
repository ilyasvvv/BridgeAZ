import { useEffect, useMemo, useRef, useState } from "react";
import { countries } from "../utils/countries";

const MAX_RESULTS = 8;

export default function CountryMultiSelect({ selected = [], onChange }) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = countries.filter((c) => !selected.includes(c));
    if (!term) return filtered.slice(0, MAX_RESULTS);
    return filtered
      .filter((c) => c.toLowerCase().includes(term))
      .slice(0, MAX_RESULTS);
  }, [query, selected]);

  const addCountry = (country) => {
    if (!selected.includes(country)) {
      onChange([...selected, country]);
    }
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const removeCountry = (country) => {
    onChange(selected.filter((c) => c !== country));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (e.key === "Backspace" && !query && selected.length) {
      removeCountry(selected[selected.length - 1]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((p) => (p + 1 >= matches.length ? 0 : p + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setActiveIndex((p) => (p <= 0 ? matches.length - 1 : p - 1));
      return;
    }
    if (e.key === "Enter" && isOpen) {
      e.preventDefault();
      e.stopPropagation();
      const next = activeIndex >= 0 ? matches[activeIndex] : matches[0];
      if (next) addCountry(next);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((country) => (
          <span
            key={country}
            className="inline-flex items-center gap-1 rounded-full border border-coral/30 bg-coral/8 px-2.5 py-0.5 text-xs font-medium text-coral/90"
          >
            {country}
            <button
              type="button"
              onClick={() => removeCountry(country)}
              className="ml-0.5 text-coral/50 hover:text-coral"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="min-w-[120px] flex-1 bg-transparent py-1 text-sm text-sand outline-none placeholder:text-mist/40"
          placeholder={selected.length ? "Add location..." : "Filter by location..."}
          autoComplete="off"
        />
      </div>
      {isOpen && matches.length > 0 && (
        <ul className="absolute left-0 z-30 mt-1.5 max-h-52 w-64 overflow-auto rounded-xl border border-border bg-white p-1 shadow-elevated">
          {matches.map((country, i) => (
            <li key={country}>
              <button
                type="button"
                onClick={() => addCountry(country)}
                className={`w-full rounded-lg px-3 py-1.5 text-left text-sm ${
                  i === activeIndex
                    ? "bg-accent/10 text-accent"
                    : "text-sand hover:bg-charcoal"
                }`}
              >
                {country}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
