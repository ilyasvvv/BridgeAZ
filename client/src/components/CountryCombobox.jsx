import { useEffect, useMemo, useRef, useState } from "react";
import { countries } from "../utils/countries";

const MAX_RESULTS = 12;

export default function CountryCombobox({ value = "", onChange, id = "country", label = "Country" }) {
  const rootRef = useRef(null);
  const [query, setQuery] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return countries.slice(0, MAX_RESULTS);
    return countries
      .filter((country) => country.toLowerCase().includes(term))
      .slice(0, MAX_RESULTS);
  }, [query]);

  const selectCountry = (country) => {
    setQuery(country);
    onChange(country);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev + 1 >= matches.length ? 0 : prev + 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => (prev <= 0 ? matches.length - 1 : prev - 1));
      return;
    }

    if (event.key === "Enter" && isOpen) {
      event.preventDefault();
      const next = activeIndex >= 0 ? matches[activeIndex] : matches[0];
      if (next) selectCountry(next);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <label htmlFor={id} className="text-xs uppercase tracking-wide text-mist">
        {label}
      </label>
      <input
        id={id}
        value={query}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          onChange(next);
          setIsOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
        placeholder="Type to search country"
        autoComplete="off"
      />
      {isOpen && matches.length > 0 && (
        <ul className="absolute z-30 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-white/10 bg-slate p-1 shadow-xl">
          {matches.map((country, index) => (
            <li key={country}>
              <button
                type="button"
                onClick={() => selectCountry(country)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  index === activeIndex
                    ? "bg-teal/20 text-teal"
                    : "text-sand hover:bg-white/10"
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
