import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import { resolvePostLoginPath } from "../utils/authFlow";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Reset link is missing or incomplete.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiClient.post("/auth/reset-password", { token, password });
      login(data.token, data.user);
      navigate(resolvePostLoginPath(data.user));
    } catch (err) {
      setError(err.message || "Password reset failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6" style={{ "--accent": "29 29 68", "--accent-soft": "95 96 116" }}>
      <div className="space-y-2">
        <h1 className="font-display text-3xl">Set a new password</h1>
        <p className="text-sm text-mist">Choose a password with at least 8 characters.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass space-y-4 rounded-2xl p-6">
        <div>
          <label className="text-xs uppercase tracking-wide text-mist">New password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2 text-sand"
            minLength={8}
            required
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-mist">Confirm password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2 text-sand"
            minLength={8}
            required
          />
        </div>

        {error && <p className="text-sm text-coral">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-sand px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Updating..." : "Reset password"}
        </button>
      </form>

      <p className="text-sm text-mist">
        Need a new link? <Link to="/forgot-password" className="text-accent">Request another reset email</Link>
      </p>
    </div>
  );
}
