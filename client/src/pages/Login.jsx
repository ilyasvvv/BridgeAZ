import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import GoogleAuthButton, { isGoogleAuthAvailable } from "../components/GoogleAuthButton";
import { useAuth } from "../utils/auth";
import { resolvePostLoginPath } from "../utils/authFlow";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [googleUserType, setGoogleUserType] = useState("student");
  const navigate = useNavigate();
  const { login, user } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await apiClient.post("/auth/login", form);
      login(data.token, data.user);
      navigate(resolvePostLoginPath(data.user));
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6" style={{ "--accent": "29 29 68", "--accent-soft": "95 96 116" }}>
      <h1 className="font-display text-3xl">Welcome back</h1>
      <p className="text-sm text-mist">Log in to stay connected with Bizim Circle.</p>
      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-mist">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2 text-sand"
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
            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2 text-sand"
            required
          />
        </div>
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-xs uppercase tracking-wide text-accent">
            Forgot password?
          </Link>
        </div>
        {error && <p className="text-sm text-coral">{error}</p>}
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
                First time with Google? Choose the profile type we should create.
              </p>
              <select
                value={googleUserType}
                onChange={(event) => setGoogleUserType(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-4 py-2 text-sand"
              >
                <option value="student">Student</option>
                <option value="professional">Professional</option>
              </select>
            </div>
            <GoogleAuthButton
              text="signin_with"
              userType={googleUserType}
              onSuccess={(data) => {
                login(data.token, data.user);
                navigate(resolvePostLoginPath(data.user));
              }}
              onError={(message) => setError(message)}
            />
          </div>
        )}
      </form>
      <p className="text-sm text-mist">
        New here? <Link to="/join" className="text-accent">Create an account</Link>
      </p>
    </div>
  );
}
