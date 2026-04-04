// Qovshaq Phase 3A — Discover people & communities
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../utils/auth";
import { apiClient } from "../../api/client";
import { formatLocation } from "../utils/locations";
import { categoryMap } from "../utils/categories";
import QCard from "../components/QCard";
import QAvatar from "../components/QAvatar";
import QBadge from "../components/QBadge";
import QInput from "../components/QInput";

export default function QDiscover() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        setUsers([]);
        return;
      }
      setLoading(true);
      try {
        const data = await apiClient.get(`/search?q=${encodeURIComponent(search)}&limit=20`, token);
        setUsers(Array.isArray(data) ? data : data.users || []);
      } catch {
        setUsers([]);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, token]);

  return (
    <div>
      <h1 className="font-q-display text-2xl text-q-text mb-5">Discover</h1>

      <QInput
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search people by name, city, or interest..."
        className="mb-6"
      />

      {!search && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">{"\u{1F50D}"}</div>
          <p className="text-q-text-muted text-sm">
            Search for people in the Azerbaijani community
          </p>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-q-surface rounded-xl border border-q-border/50 p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full q-skeleton" />
              <div className="space-y-2">
                <div className="h-4 w-32 q-skeleton" />
                <div className="h-3 w-24 q-skeleton" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {users.map((person, i) => (
          <motion.div
            key={person._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link to={`/q/profile/${person._id}`}>
              <QCard hover className="p-4 flex items-center gap-4">
                <QAvatar user={person} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-q-text truncate">{person.name}</div>
                  {person.headline && (
                    <div className="text-sm text-q-text-muted truncate">{person.headline}</div>
                  )}
                  {person.qLocation?.city && (
                    <div className="text-xs text-q-text-muted mt-0.5">
                      {formatLocation(person.qLocation)}
                    </div>
                  )}
                  {person.qInterests?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {person.qInterests.slice(0, 3).map((interest) => {
                        const cat = categoryMap[interest];
                        return (
                          <QBadge key={interest} color={cat?.color || "default"} icon={cat?.icon}>
                            {cat?.label || interest}
                          </QBadge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </QCard>
            </Link>
          </motion.div>
        ))}
      </div>

      {search && !loading && users.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">{"\u{1F331}"}</div>
          <p className="text-q-text-muted text-sm">No one found for "{search}"</p>
        </div>
      )}
    </div>
  );
}
