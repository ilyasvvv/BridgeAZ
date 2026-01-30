import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";

export default function Join() {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    userType: "student",
    currentRegion: "AZ"
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await apiClient.post("/auth/login", loginForm);
      login(data.token, data.user);
      const roles = Array.isArray(data.user.roles) ? data.user.roles : [];
      const canAdmin = data.user.isAdmin || roles.some((role) => ["staffC", "staffB", "adminA"].includes(role));
      navigate(canAdmin ? "/admin" : "/fyp");
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await apiClient.post("/auth/register", registerForm);
      login(data.token, data.user);
      navigate("/fyp");
    } catch (err) {
      setError(err.message || "Registration failed");
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Join BridgeAZ</h1>
        <div className="flex gap-2 text-xs uppercase tracking-wide">
          {[
            { value: "login", label: "Log in" },
            { value: "register", label: "Sign up" }
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setMode(item.value)}
              className={`rounded-full border px-3 py-1 ${
                mode === item.value
                  ? "border-teal bg-teal/20 text-teal"
                  : "border-white/10 text-mist hover:border-teal"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-coral">{error}</p>}

      {mode === "login" ? (
        <form onSubmit={handleLogin} className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-mist">Email</label>
            <input
              name="email"
              type="email"
              value={loginForm.email}
              onChange={(event) =>
                setLoginForm((prev) => ({ ...prev, email: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-mist">Password</label>
            <input
              name="password"
              type="password"
              value={loginForm.password}
              onChange={(event) =>
                setLoginForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-teal px-6 py-3 text-xs font-semibold uppercase tracking-wide text-charcoal"
          >
            Log in
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-mist">Name</label>
            <input
              name="name"
              value={registerForm.name}
              onChange={(event) =>
                setRegisterForm((prev) => ({ ...prev, name: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-mist">Email</label>
            <input
              name="email"
              type="email"
              value={registerForm.email}
              onChange={(event) =>
                setRegisterForm((prev) => ({ ...prev, email: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              required
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-mist">Password</label>
            <input
              name="password"
              type="password"
              value={registerForm.password}
              onChange={(event) =>
                setRegisterForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              required
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-mist">Role</label>
              <select
                value={registerForm.userType}
                onChange={(event) =>
                  setRegisterForm((prev) => ({ ...prev, userType: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              >
                <option value="student">Student</option>
                <option value="professional">Professional</option>
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-mist">Region</label>
              <select
                value={registerForm.currentRegion}
                onChange={(event) =>
                  setRegisterForm((prev) => ({ ...prev, currentRegion: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              >
                <option value="AZ">Azerbaijan</option>
                <option value="TR">Turkey</option>
                <option value="US">United States</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-coral px-6 py-3 text-xs font-semibold uppercase tracking-wide text-charcoal"
          >
            Create account
          </button>
        </form>
      )}
    </div>
  );
}
