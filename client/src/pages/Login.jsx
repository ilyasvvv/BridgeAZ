import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
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
      const data = await apiClient.post("/auth/login", form);
      login(data.token, data.user);
      const roles = Array.isArray(data.user.roles) ? data.user.roles : [];
      const canAdmin = data.user.isAdmin || roles.some((role) => ["staffC", "staffB", "adminA"].includes(role));
      navigate(canAdmin ? "/admin" : "/fyp");
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="font-display text-3xl">Welcome back</h1>
      <p className="text-sm text-mist">Log in to stay connected with BridgeAZ.</p>
      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
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
        {error && <p className="text-sm text-coral">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-full bg-teal px-6 py-3 text-xs font-semibold uppercase tracking-wide text-charcoal"
        >
          Log in
        </button>
      </form>
      <p className="text-sm text-mist">
        New here? <Link to="/join" className="text-teal">Create an account</Link>
      </p>
    </div>
  );
}
