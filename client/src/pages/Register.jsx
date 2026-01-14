import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";

const regions = [
  { value: "AZ", label: "Azerbaijan" },
  { value: "TR", label: "Turkey" },
  { value: "US", label: "United States" }
];

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    userType: "student",
    currentRegion: "AZ"
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await apiClient.post("/auth/register", form);
      login(data.token, data.user);
      navigate("/fyp");
    } catch (err) {
      setError(err.message || "Registration failed");
    }
  };

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="font-display text-3xl">Join BridgeAZ</h1>
      <p className="text-sm text-mist">
        Students get access to verified mentorship. Professionals can opt-in to become mentors.
      </p>
      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-mist">Full name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-mist">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-mist">Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-mist">I am a</label>
          <div className="mt-2 flex gap-3">
            {["student", "professional"].map((type) => (
              <label
                key={type}
                className={`cursor-pointer rounded-full border px-4 py-2 text-xs uppercase tracking-wide ${
                  form.userType === type
                    ? "border-teal bg-teal/20 text-teal"
                    : "border-white/10 text-mist"
                }`}
              >
                <input
                  type="radio"
                  name="userType"
                  value={type}
                  checked={form.userType === type}
                  onChange={handleChange}
                  className="hidden"
                />
                {type}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-mist">Current region</label>
          <select
            name="currentRegion"
            value={form.currentRegion}
            onChange={handleChange}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
          >
            {regions.map((region) => (
              <option key={region.value} value={region.value}>
                {region.label}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-coral">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-full bg-coral px-6 py-3 text-xs font-semibold uppercase tracking-wide text-charcoal"
        >
          Create account
        </button>
      </form>
      <p className="text-sm text-mist">
        Already part of BridgeAZ? <Link to="/login" className="text-teal">Log in</Link>
      </p>
    </div>
  );
}
