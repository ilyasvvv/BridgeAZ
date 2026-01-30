import { useState } from "react";
import { apiClient } from "../api/client";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("");
    try {
      await apiClient.post("/contact", form);
      setStatus("Thanks! Your message has been sent.");
      setForm({ name: "", email: "", message: "" });
    } catch (error) {
      setStatus(error.message || "Failed to send message");
    }
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-3xl">Contact BridgeAZ</h1>
      <p className="text-sm text-mist">
        Have questions or ideas? Send us a note and we will follow up.
      </p>
      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs uppercase tracking-wide text-mist">Name</label>
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-mist">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
            required
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-mist">Message</label>
          <textarea
            rows={4}
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
            required
          />
        </div>
        {status && <p className="text-sm text-mist">{status}</p>}
        <button
          type="submit"
          className="rounded-full bg-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
        >
          Send message
        </button>
      </form>
    </div>
  );
}
