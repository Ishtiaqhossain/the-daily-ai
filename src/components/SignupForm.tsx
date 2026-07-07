"use client";

import { useState } from "react";

export function SignupForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setState("done");
      setMsg(data.message || "You're on the list.");
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (state === "done") {
    return (
      <p role="status" className={`text-sm text-signalHigh font-medium ${compact ? "mt-4" : ""}`}>
        ✓ {msg}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "mt-4" : ""}>
      <label htmlFor="signup-email" className="label mb-2 block">
        {compact ? "Email address" : "Get the daily brief in your inbox"}
      </label>
      <div className="flex gap-2 max-w-md">
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          aria-busy={state === "loading"}
          className="flex-1 min-w-0 border border-hair bg-paper px-3 py-2 text-sm rounded focus:border-accent"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="bg-accent text-paper px-4 py-2 text-sm font-medium rounded hover:opacity-90 disabled:opacity-60 whitespace-nowrap"
        >
          {state === "loading" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      <p role="alert" aria-live="assertive" className="min-h-0">
        {state === "error" && <span className="mt-1.5 block text-xs text-signalLow">{msg}</span>}
      </p>
      {!compact && (
        <p className="mt-1.5 label">One email each morning. No hype. Unsubscribe anytime.</p>
      )}
    </form>
  );
}
