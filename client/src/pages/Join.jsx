import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import GoogleAuthButton, { isGoogleAuthAvailable } from "../components/GoogleAuthButton";
import { useAuth } from "../utils/auth";
import { resolvePostLoginPath } from "../utils/authFlow";
import CountryCombobox from "../components/CountryCombobox";

export default function Join() {
  const [mode, setMode] = useState("register");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    userType: "student",
    currentRegion: ""
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    if (user) navigate("/fyp", { replace: true });
  }, [user, navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await apiClient.post("/auth/login", loginForm);
      login(data.token, data.user);
      navigate(resolvePostLoginPath(data.user));
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
    <div className="mx-auto flex max-w-2xl flex-col gap-6" style={{ "--accent": "29 29 68", "--accent-soft": "95 96 116" }}>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">{mode === "login" ? "Welcome back" : "Join Bizim Circle"}</h1>
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
                  ? "border-sand/30 bg-sand/5 text-sand"
                  : "border-border text-mist hover:border-sand/30"
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
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2 text-sand"
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
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2 text-sand"
              required
            />
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs uppercase tracking-wide text-accent">
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-sand px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Log in
          </button>

          {isGoogleAuthAvailable && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-mist">Or continue with Google</p>
                <p className="text-sm text-mist">
                  First time with Google? Your selected sign-up role will be used to create the account.
                </p>
              </div>
              <GoogleAuthButton
                text="signin_with"
                userType={registerForm.userType}
                currentRegion={registerForm.currentRegion}
                onSuccess={(data) => {
                  login(data.token, data.user);
                  navigate(resolvePostLoginPath(data.user));
                }}
                onError={(message) => setError(message)}
              />
            </div>
          )}
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
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2 text-sand"
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
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2 text-sand"
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
              className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2 text-sand"
              minLength={8}
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
                className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2 text-sand"
              >
                <option value="student">Student</option>
                <option value="professional">Professional</option>
              </select>
            </div>
            <div>
              <CountryCombobox
                id="join-country"
                label="Country"
                value={registerForm.currentRegion}
                onChange={(nextValue) =>
                  setRegisterForm((prev) => ({ ...prev, currentRegion: nextValue }))
                }
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-sand px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Create account
          </button>

          {isGoogleAuthAvailable && (
            <div className="space-y-4 border-t border-border pt-4">
              <p className="text-xs uppercase tracking-wide text-mist">Or create your account with Google</p>
              <GoogleAuthButton
                text="signup_with"
                userType={registerForm.userType}
                currentRegion={registerForm.currentRegion}
                onSuccess={(data) => {
                  login(data.token, data.user);
                  navigate(resolvePostLoginPath(data.user));
                }}
                onError={(message) => setError(message)}
              />
            </div>
          )}
        </form>
      )}
    </div>
  );
}
