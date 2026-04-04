// Qovshaq Phase 2B — City/country location selector
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { searchCities, countryFlag, formatLocation } from "../utils/locations";

export default function QLocationPicker({ value, onChange, label, className = "" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    setResults(searchCities(query));
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (loc) => {
    onChange({
      country: loc.country,
      countryCode: loc.countryCode,
      city: loc.city,
      region: "",
    });
    setOpen(false);
    setQuery("");
  };

  const handleClear = () => {
    onChange({ country: "", countryCode: "", city: "", region: "" });
  };

  const displayValue = formatLocation(value);

  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && (
        <label className="block text-sm font-medium text-q-text mb-1.5">{label}</label>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-q-surface border border-q-border rounded-lg text-sm text-left hover:border-q-text-muted/40 transition-colors"
      >
        <svg className="w-4 h-4 text-q-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className={displayValue ? "text-q-text" : "text-q-text-muted/50"}>
          {displayValue || "Select location..."}
        </span>
        {displayValue && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="ml-auto text-q-text-muted hover:text-q-text"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1 w-full bg-q-surface border border-q-border rounded-xl shadow-q-floating overflow-hidden"
          >
            <div className="p-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search city or country..."
                className="w-full px-3 py-2 bg-q-surface-alt rounded-lg text-sm text-q-text placeholder:text-q-text-muted/50 outline-none"
                autoFocus
              />
            </div>

            {/* Global option */}
            <button
              type="button"
              onClick={() => {
                onChange({ country: "", countryCode: "", city: "", region: "" });
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-q-primary-light transition-colors"
            >
              <span>{"\u{1F30D}"}</span>
              <span className="font-medium text-q-primary">Global — All locations</span>
            </button>

            <div className="max-h-60 overflow-y-auto">
              {results.map((loc) => (
                <button
                  key={`${loc.countryCode}-${loc.city}`}
                  type="button"
                  onClick={() => handleSelect(loc)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-q-surface-alt transition-colors"
                >
                  <span>{countryFlag(loc.countryCode)}</span>
                  <span className="text-q-text">{loc.city}</span>
                  <span className="text-q-text-muted text-xs">{loc.country}</span>
                </button>
              ))}
              {results.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-q-text-muted">
                  No cities found for "{query}"
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
