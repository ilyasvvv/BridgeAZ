import { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    setPreviewUrl("");

    try {
      const data = await apiClient.post("/auth/forgot-password", { email });
      setMessage(data.message || "Check your email for reset instructions.");
      setPreviewUrl(data.resetUrl || "");
    } catch (err) {
      setError(err.message || "Could not start password reset");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6" style={{ "--accent": "29 29 68", "--accent-soft": "95 96 116" }}>
      <div className="space-y-2">
        <h1 className="font-display text-3xl">Forgot your password?</h1>
        <p className="text-sm text-mist">Enter your email and we&apos;ll send a secure reset link if the account exists.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass space-y-4 rounded-2xl p-6">
        <div>
          <label className="text-xs uppercase tracking-wide text-mist">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-2 text-sand"
            required
          />
        </div>

        {error && <p className="text-sm text-coral">{error}</p>}
        {message && <p className="text-sm text-mist">{message}</p>}
        {previewUrl && (
          <p className="text-sm text-mist">
            Local preview: <a href={previewUrl} className="text-accent underline underline-offset-4">{previewUrl}</a>
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-sand px-6 py-3 text-xs font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="text-sm text-mist">
        Remembered it? <Link to="/login" className="text-accent">Back to log in</Link>
      </p>
    </div>
  );
}
