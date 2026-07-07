"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { QueuedTask } from "@/lib/types";

export function QueueClient() {
  const [items, setItems] = useState<QueuedTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  async function load() {
    setError(false);
    try {
      const res = await fetch("/api/queue");
      if (!res.ok) throw new Error();
      setItems((await res.json()).queue || []);
    } catch {
      setError(true);
    } finally {
      setLoaded(true);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: QueuedTask["status"]) {
    setItems((prev) => prev.map((q) => (q.id === id ? { ...q, status } : q))); // optimistic
    try {
      await fetch("/api/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
    } catch {
      load();
    }
  }
  async function remove(id: string) {
    setItems((prev) => prev.filter((q) => q.id !== id));
    try {
      await fetch("/api/queue", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      load();
    }
  }

  if (!loaded) return <p role="status" className="label">Loading…</p>;
  if (error)
    return (
      <p role="alert" className="text-sm text-signalLow">
        Couldn&rsquo;t load your queue.{" "}
        <button onClick={load} className="link-underline text-accent">Retry</button>
      </p>
    );

  const queued = items.filter((q) => q.status === "queued");
  const done = items.filter((q) => q.status === "done");

  if (items.length === 0) {
    return (
      <div className="rounded border border-hair bg-accentSoft/40 px-4 py-6 text-sm">
        <p className="font-medium">Nothing queued yet.</p>
        <p className="mt-1 text-subtle">
          On the front page, hit <span className="text-ink">＋ Queue</span> on any brief. The Ledger
          drafts a concrete, project-grounded task you can come back to.
        </p>
        <Link href="/" className="mt-3 inline-block kicker text-accent hover:text-ink">
          ← Back to the edition
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="kicker mb-2">To do ({queued.length})</h2>
        {queued.length === 0 && <p className="text-sm text-subtle">All caught up.</p>}
        <ul className="divide-y divide-hair">
          {queued.map((q) => (
            <TaskRow key={q.id} q={q} onDone={() => setStatus(q.id, "done")} onRemove={() => remove(q.id)} />
          ))}
        </ul>
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="kicker mb-2">Done ({done.length})</h2>
          <ul className="divide-y divide-hair opacity-60">
            {done.map((q) => (
              <TaskRow
                key={q.id}
                q={q}
                done
                onReopen={() => setStatus(q.id, "queued")}
                onRemove={() => remove(q.id)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function TaskRow({
  q,
  done,
  onDone,
  onReopen,
  onRemove,
}: {
  q: QueuedTask;
  done?: boolean;
  onDone?: () => void;
  onReopen?: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="py-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={!!done}
          onChange={() => (done ? onReopen?.() : onDone?.())}
          className="mt-1 accent-accent shrink-0"
          aria-label={done ? `Reopen task: ${q.taskTitle}` : `Mark done: ${q.taskTitle}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="kicker">{q.section}</span>
            {q.matchedProject && (
              <>
                <span className="text-hair">·</span>
                <span className="kicker text-accent">{q.matchedProject}</span>
              </>
            )}
            {!q.drafted && (
              <>
                <span className="text-hair">·</span>
                <span className="label">saved</span>
              </>
            )}
          </div>
          <h3 className={`font-serif text-xl font-semibold leading-snug mt-0.5 ${done ? "line-through" : ""}`}>
            {q.taskTitle}
          </h3>
          <p className="mt-1 text-sm text-ink/85 leading-relaxed">{q.context}</p>
          <p className="mt-1.5 text-sm leading-relaxed">
            <span className="kicker">Do</span> {q.instruction}
          </p>
          {q.citations && q.citations.length > 0 && (
            <p className="mt-1.5 text-xs text-subtle">
              <span className="kicker">Grounded in your code</span>{" "}
              <span className="font-mono">{q.citations.join("  ·  ")}</span>
            </p>
          )}
          <div className="mt-2 flex items-center gap-3 text-xs">
            {q.source && (
              <a
                href={q.source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link-underline text-accent"
              >
                {q.source.label} ↗
              </a>
            )}
            <Link href={`/#${q.slug}`} className="link-underline text-subtle hover:text-ink">
              Open brief
            </Link>
            <button onClick={onRemove} className="text-subtle hover:text-signalLow ml-auto" aria-label={`Remove ${q.taskTitle}`}>
              Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
