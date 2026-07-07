"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ActiveProject, InterestSignal, SourceConfig, SourceType } from "@/lib/types";

const SOURCE_TYPES: { type: SourceType; label: string; placeholder: string; needsValue: boolean }[] = [
  { type: "github", label: "GitHub repo", placeholder: "owner/repo or https://github.com/owner/repo", needsValue: true },
  { type: "folder", label: "Local folder", placeholder: "/Users/you/code/project  (or .)", needsValue: true },
  { type: "claude-sessions", label: "Claude sessions", placeholder: "(reads your recent Claude Code sessions)", needsValue: false },
  { type: "text", label: "Freeform note", placeholder: "Describe what you're working on…", needsValue: true },
];

const KINDS: InterestSignal["kind"][] = ["tool", "topic", "company", "technique", "intent"];
const INPUT = "border border-hair bg-paper px-2 py-1.5 text-sm rounded focus:border-accent";

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong.";
}

async function api(url: string, opts?: RequestInit) {
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status}).`);
  return data;
}

export function SettingsClient({ llm }: { llm: { provider: string; local: boolean } }) {
  const [sources, setSources] = useState<SourceConfig[]>([]);
  const [interests, setInterests] = useState<InterestSignal[]>([]);
  const [projects, setProjects] = useState<ActiveProject[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [role, setRole] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // add-source form
  const [newType, setNewType] = useState<SourceType>("github");
  const [newValue, setNewValue] = useState("");
  const [newInterest, setNewInterest] = useState("");

  async function load() {
    setLoaded(false);
    let ok = true;
    try {
      const s = await api("/api/sources");
      setSources(s.sources || []);
    } catch {
      ok = false;
    }
    try {
      const { profile: p } = await api("/api/profile");
      if (p) {
        setInterests(p.interests || []);
        setProjects(p.activeProjects || []);
        setBlocked(p.blockedTopics || []);
        setRole(p.roleSignal || "");
      }
    } catch {
      ok = false;
    }
    setLoadError(!ok);
    setLoaded(true);
  }

  useEffect(() => {
    load();
  }, []);

  function flash(kind: "ok" | "err", msg: string) {
    setStatus({ kind, msg });
    if (kind === "ok") setTimeout(() => setStatus(null), 4000);
  }

  /** Run a mutation with consistent busy + error handling. */
  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      flash("err", errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  // ---- sources ----
  function addSource() {
    const meta = SOURCE_TYPES.find((t) => t.type === newType)!;
    if (meta.needsValue && !newValue.trim()) return;
    setSources((prev) => [
      ...prev,
      { id: uid(), type: newType, value: meta.needsValue ? newValue.trim() : "", enabled: true },
    ]);
    setNewValue("");
  }
  function updateSource(id: string, patch: Partial<SourceConfig>) {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function removeSource(id: string) {
    setSources((prev) => prev.filter((s) => s.id !== id));
  }
  const saveSources = () =>
    run("sources", async () => {
      const d = await api("/api/sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources }),
      });
      setSources(d.sources);
      flash("ok", "Sources saved.");
    });

  // ---- topics ----
  function updateInterest(i: number, patch: Partial<InterestSignal>) {
    setInterests((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch, pinned: true } : x)));
  }
  function removeInterest(i: number) {
    setInterests((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addInterest() {
    const label = newInterest.trim();
    if (!label) return;
    setInterests((prev) => [{ label, kind: "topic", weight: 4, evidence: "added in settings", pinned: true }, ...prev]);
    setNewInterest("");
  }
  function removeProject(i: number) {
    setProjects((prev) => prev.filter((_, idx) => idx !== i));
  }
  const saveTopics = () =>
    run("topics", async () => {
      const { profile: p } = await api("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleSignal: role, interests, activeProjects: projects }),
      });
      setInterests(p.interests || []);
      setBlocked(p.blockedTopics || []);
      flash("ok", "Topics saved. Deleted topics stay hidden; pinned ones survive a rebuild.");
    });

  const resetHidden = () =>
    run("topics", async () => {
      const { profile: p } = await api("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleSignal: role, interests, activeProjects: projects, blockedTopics: [] }),
      });
      setBlocked(p.blockedTopics || []);
      flash("ok", "Hidden topics cleared — they can be re-inferred on the next rebuild.");
    });

  // ---- pipeline ----
  const rebuild = () =>
    run("rebuild", async () => {
      setStatus({ kind: "ok", msg: "Reading your sources and re-inferring topics… (10–30s)" });
      const data = await api("/api/profile/rebuild", { method: "POST" });
      if (!data.profile) throw new Error("Rebuild returned no profile.");
      setInterests(data.profile.interests || []);
      setProjects(data.profile.activeProjects || []);
      setBlocked(data.profile.blockedTopics || []);
      setRole(data.profile.roleSignal || "");
      flash("ok", "Profile rebuilt from your sources.");
    });
  const retune = () =>
    run("retune", async () => {
      setStatus({ kind: "ok", msg: "Re-ranking today's news against your profile…" });
      await api("/api/retune", { method: "POST" });
      flash("ok", "Edition re-ranked. Refresh the front page to see it.");
    });

  if (!loaded) {
    return (
      <p role="status" className="label">
        Loading…
      </p>
    );
  }

  const meta = SOURCE_TYPES.find((t) => t.type === newType)!;

  return (
    <div className="space-y-10">
      {/* Live region for async status — always present so it's announced */}
      <div
        role={status?.kind === "err" ? "alert" : "status"}
        aria-live={status?.kind === "err" ? "assertive" : "polite"}
        className={status ? "sticky top-2 z-10" : "sr-only"}
      >
        {status && (
          <div
            className={`rounded border px-3 py-2 text-sm ${
              status.kind === "ok"
                ? "border-signalHigh/40 bg-accentSoft text-ink"
                : "border-signalLow/40 bg-signalLow/10 text-signalLow"
            }`}
          >
            {status.msg}
          </div>
        )}
      </div>

      {loadError && (
        <div role="alert" className="rounded border border-signalLow/40 bg-signalLow/10 px-3 py-2 text-sm">
          Couldn&rsquo;t load your settings.{" "}
          <button onClick={load} className="link-underline text-accent font-medium">
            Retry
          </button>
        </div>
      )}

      {/* SOURCES */}
      <section>
        <h2 className="font-serif text-2xl font-bold rule-double pt-2">Sources</h2>
        <p className="mt-1 text-sm text-subtle">
          What the profiler reads to understand your current work. Files are read on your machine
          {llm.local
            ? ` and processed locally (LLM: ${llm.provider}) — nothing leaves your computer.`
            : `; only distilled excerpts are sent to your LLM provider (${llm.provider}) to infer topics.`}
        </p>

        <ul className="mt-4 divide-y divide-hair">
          {sources.map((s) => {
            const tmeta = SOURCE_TYPES.find((t) => t.type === s.type)!;
            const name = `${tmeta.label}${s.value ? `: ${s.value}` : ""}`;
            return (
              <li key={s.id} className="py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <div className="flex items-center gap-2 sm:w-40 shrink-0">
                  <input
                    type="checkbox"
                    checked={s.enabled}
                    onChange={(e) => updateSource(s.id, { enabled: e.target.checked })}
                    className="accent-accent"
                    aria-label={`Enable source ${name}`}
                  />
                  <span className="kicker">{tmeta.label}</span>
                </div>
                {tmeta.needsValue ? (
                  <input
                    value={s.value}
                    onChange={(e) => updateSource(s.id, { value: e.target.value })}
                    placeholder={tmeta.placeholder}
                    aria-label={`${tmeta.label} value`}
                    className={`basis-full sm:basis-0 sm:flex-1 min-w-0 ${INPUT} py-1`}
                  />
                ) : (
                  <span className="basis-full sm:basis-0 sm:flex-1 min-w-0 text-sm text-subtle italic">
                    {tmeta.placeholder}
                  </span>
                )}
                <button
                  onClick={() => removeSource(s.id)}
                  className="text-subtle hover:text-signalLow text-sm px-2 py-1 ml-auto"
                  aria-label={`Remove source ${name}`}
                >
                  ✕
                </button>
              </li>
            );
          })}
          {sources.length === 0 && <li className="py-3 text-sm text-subtle">No sources yet — add one below.</li>}
        </ul>

        {/* add source */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as SourceType)}
            aria-label="New source type"
            className={INPUT}
          >
            {SOURCE_TYPES.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
          {meta.needsValue && (
            <input
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSource()}
              placeholder={meta.placeholder}
              aria-label="New source value"
              className={`basis-full sm:basis-0 sm:flex-1 min-w-0 ${INPUT}`}
            />
          )}
          <button onClick={addSource} className="border border-ink px-3 py-1.5 text-sm rounded hover:bg-ink hover:text-paper">
            Add
          </button>
        </div>

        <button
          onClick={saveSources}
          disabled={busy === "sources"}
          className="mt-4 bg-accent text-paper px-4 py-2 text-sm font-medium rounded hover:opacity-90 disabled:opacity-60"
        >
          {busy === "sources" ? "Saving…" : "Save sources"}
        </button>
      </section>

      {/* TOPICS */}
      <section>
        <h2 className="font-serif text-2xl font-bold rule-double pt-2">Inferred topics</h2>
        <p className="mt-1 text-sm text-subtle">
          The interests the LLM uses to pick and rank your news. Edit a weight, delete, or add your own.
          Anything you touch is <span className="text-ink">pinned ★</span> and survives a rebuild.
        </p>

        {role && (
          <div className="mt-4">
            <label htmlFor="role-signal" className="kicker">
              Role signal
            </label>
            <input
              id="role-signal"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={`mt-1 w-full ${INPUT}`}
            />
          </div>
        )}

        {projects.length > 0 && (
          <div className="mt-5">
            <span className="kicker">Active projects</span>
            <ul className="mt-2 space-y-2">
              {projects.map((p, i) => (
                <li key={i} className="flex flex-wrap items-start gap-x-2 text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-subtle flex-1 min-w-0">— {p.summary}</span>
                  <button
                    onClick={() => removeProject(i)}
                    className="text-subtle hover:text-signalLow px-2"
                    aria-label={`Remove project ${p.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5">
          <span className="kicker">Interests</span>
          {/* add interest */}
          <div className="mt-2 flex items-center gap-2">
            <input
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addInterest()}
              placeholder="Add a topic, tool, or company…"
              aria-label="Add an interest"
              className={`flex-1 ${INPUT}`}
            />
            <button onClick={addInterest} className="border border-ink px-3 py-1.5 text-sm rounded hover:bg-ink hover:text-paper">
              Add
            </button>
          </div>

          <ul className="mt-3 divide-y divide-hair">
            {interests.map((it, i) => (
              <li key={i} className="py-2 flex flex-wrap items-center gap-2">
                <span
                  title={it.pinned ? "Pinned" : "Inferred"}
                  aria-hidden="true"
                  className={it.pinned ? "text-accent" : "text-hair"}
                >
                  ★
                </span>
                <input
                  value={it.label}
                  onChange={(e) => updateInterest(i, { label: e.target.value })}
                  aria-label={`Topic ${i + 1} label`}
                  className="basis-full sm:basis-[55%] sm:flex-1 min-w-0 bg-transparent text-sm border-b border-hair sm:border-transparent focus:border-accent"
                />
                <select
                  value={it.kind}
                  onChange={(e) => updateInterest(i, { kind: e.target.value as InterestSignal["kind"] })}
                  aria-label={`Kind for ${it.label || "topic"}`}
                  className="text-xs text-subtle bg-paper border border-hair rounded px-1 py-0.5"
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <label className="text-xs text-subtle flex items-center gap-1">
                  <span aria-hidden="true">w</span>
                  <span className="sr-only">Weight for {it.label || "topic"}</span>
                  <select
                    value={it.weight}
                    onChange={(e) => updateInterest(i, { weight: Number(e.target.value) })}
                    aria-label={`Weight for ${it.label || "topic"}`}
                    className="bg-paper border border-hair rounded px-1 py-0.5"
                  >
                    {[1, 2, 3, 4, 5].map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() => removeInterest(i)}
                  className="text-subtle hover:text-signalLow text-sm px-2 ml-auto"
                  aria-label={`Remove topic ${it.label || i + 1}`}
                >
                  ✕
                </button>
              </li>
            ))}
            {interests.length === 0 && (
              <li className="py-3 text-sm text-subtle">No topics yet — add some, or rebuild from your sources.</li>
            )}
          </ul>

          {blocked.length > 0 && (
            <div className="mt-3 flex flex-wrap items-start gap-2 text-xs text-subtle">
              <span className="kicker shrink-0">Hidden ({blocked.length})</span>
              <span className="flex-1 min-w-0">{blocked.join(" · ")}</span>
              <button
                onClick={resetHidden}
                disabled={!!busy}
                className="link-underline text-accent shrink-0 disabled:opacity-60"
                aria-label="Allow hidden topics to be inferred again"
              >
                Reset
              </button>
            </div>
          )}
        </div>

        <button
          onClick={saveTopics}
          disabled={busy === "topics"}
          className="mt-4 bg-accent text-paper px-4 py-2 text-sm font-medium rounded hover:opacity-90 disabled:opacity-60"
        >
          {busy === "topics" ? "Saving…" : "Save topics"}
        </button>
      </section>

      {/* PIPELINE ACTIONS */}
      <section className="rule-double pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={rebuild}
            disabled={!!busy}
            className="bg-ink text-paper px-4 py-2 text-sm font-medium rounded hover:bg-accent disabled:opacity-60"
          >
            {busy === "rebuild" ? "Rebuilding…" : "Rebuild topics from sources"}
          </button>
          <button
            onClick={retune}
            disabled={!!busy}
            className="border border-ink px-4 py-2 text-sm font-medium rounded hover:bg-ink hover:text-paper disabled:opacity-60"
          >
            {busy === "retune" ? "Re-ranking…" : "Re-rank today's news"}
          </button>
          <Link href="/" className="text-sm link-underline text-subtle hover:text-ink ml-auto">
            ← Back to the edition
          </Link>
        </div>
        <p className="mt-3 label normal-case tracking-normal">
          <span className="text-ink">Rebuild</span> re-reads your sources and re-infers topics (keeps pinned ★).{" "}
          <span className="text-ink">Re-rank</span> reorders today&rsquo;s stories and adds personalized
          implications and next steps — refresh the front page after.
        </p>
      </section>
    </div>
  );
}
