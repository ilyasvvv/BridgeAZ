import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import ProfileCard from "../components/ProfileCard";

export default function Explore() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ region: "", userType: "", isMentor: false });

  const loadUsers = async () => {
    const params = new URLSearchParams();
    if (filters.region) params.set("region", filters.region);
    if (filters.userType) params.set("userType", filters.userType);
    if (filters.isMentor) params.set("isMentor", "true");

    const data = await apiClient.get(`/users?${params.toString()}`, token);
    setUsers(data);
  };

  useEffect(() => {
    loadUsers();
  }, [filters]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="glass rounded-2xl p-5">
        <h2 className="font-display text-2xl">Explore members</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <select
            value={filters.region}
            onChange={(event) => setFilters((prev) => ({ ...prev, region: event.target.value }))}
            className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
          >
            <option value="">All Regions</option>
            <option value="AZ">Azerbaijan</option>
            <option value="TR">Turkey</option>
            <option value="US">United States</option>
          </select>
          <select
            value={filters.userType}
            onChange={(event) => setFilters((prev) => ({ ...prev, userType: event.target.value }))}
            className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
          >
            <option value="">All Types</option>
            <option value="student">Student</option>
            <option value="professional">Professional</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-mist">
            <input
              type="checkbox"
              checked={filters.isMentor}
              onChange={(event) => setFilters((prev) => ({ ...prev, isMentor: event.target.checked }))}
              className="h-4 w-4 rounded border-white/10 bg-slate/40"
            />
            Mentor only
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {users.map((member) => (
          <ProfileCard key={member._id} user={member} />
        ))}
      </div>
    </div>
  );
}
