// Qovshaq Phase 2A — Sticky filter bar
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQFilterContext } from "../context/QFilterContext";
import { categories } from "../utils/categories";
import { formatLocation } from "../utils/locations";
import QLocationPicker from "./QLocationPicker";

export default function QFilterBar() {
  const { filters, dispatch, activeFilterCount } = useQFilterContext();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="sticky top-16 z-30 -mx-4 px-4 py-3 bg-q-bg/80 backdrop-blur-lg border-b border-q-border/50 mb-4">
      {/* Top row: location + search + sort */}
      <div className="flex items-center gap-2 mb-2">
        {/* Location compact toggle */}
        <QLocationPicker
          value={filters.location}
          onChange={(loc) => dispatch({ type: "SET_LOCATION", payload: loc })}
          className="flex-1 min-w-0"
        />

        {/* Sort dropdown */}
        <select
          value={filters.sortBy}
          onChange={(e) => dispatch({ type: "SET_SORT", payload: e.target.value })}
          className="px-3 py-2.5 bg-q-surface border border-q-border rounded-lg text-sm text-q-text outline-none"
        >
          <option value="recent">Recent</option>
          <option value="popular">Popular</option>
        </select>
      </div>

      {/* Search bar */}
      <div className="relative mb-2">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-q-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => dispatch({ type: "SET_SEARCH", payload: e.target.value })}
          placeholder="Search posts, tags, people..."
          className="w-full pl-10 pr-4 py-2.5 bg-q-surface border border-q-border rounded-lg text-sm text-q-text placeholder:text-q-text-muted/50 outline-none focus:border-q-primary focus:ring-2 focus:ring-q-primary/10 transition-all"
        />
      </div>

      {/* Category pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {categories.map((cat) => {
          const active = filters.categories.includes(cat.id);
          return (
            <motion.button
              key={cat.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => dispatch({ type: "TOGGLE_CATEGORY", payload: cat.id })}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                active
                  ? "bg-q-primary text-white shadow-sm"
                  : "bg-q-surface border border-q-border text-q-text-muted hover:border-q-text-muted/40"
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Expandable extra filters */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-q-text-muted hover:text-q-text transition-colors flex items-center gap-1"
        >
          More filters
          <svg className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {activeFilterCount > 0 && (
          <>
            <span className="w-5 h-5 rounded-full bg-q-primary text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
            <button
              onClick={() => dispatch({ type: "RESET" })}
              className="text-xs text-q-danger hover:underline"
            >
              Reset
            </button>
          </>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3 flex items-center gap-3">
              <label className="text-xs text-q-text-muted">Time:</label>
              {["all", "today", "week", "month"].map((t) => (
                <button
                  key={t}
                  onClick={() => dispatch({ type: "SET_TIME_RANGE", payload: t })}
                  className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                    filters.timeRange === t
                      ? "bg-q-accent-light text-q-accent font-medium"
                      : "text-q-text-muted hover:bg-q-surface-alt"
                  }`}
                >
                  {t === "all" ? "All time" : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
