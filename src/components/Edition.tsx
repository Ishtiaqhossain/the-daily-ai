"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Personalized, Story } from "@/lib/types";
import { sectionLabel } from "@/lib/sections";
import { SignalPill } from "./SignalScore";

type ProfileSummary = {
  role: string;
  projects: string[];
  sources: string[];
} | null;

type LlmInfo = { provider: string; local: boolean };

export function Edition({
  stories,
  personalized,
  profile,
  llm,
}: {
  stories: Story[];
  personalized: Personalized[];
  profile: ProfileSummary;
  llm: LlmInfo;
}) {
  const hasTuning = personalized.length > 0;
  const [tuned, setTuned] = useState(hasTuning);

  const pMap = useMemo(
    () => Object.fromEntries(personalized.map((p) => [p.slug, p])),
    [personalized]
  );

  // In tuned mode, rank by relevance to the reader's current work.
  const view = useMemo(() => {
    if (!tuned) return stories;
    return [...stories].sort(
      (a, b) => (pMap[b.slug]?.score ?? 0) - (pMap[a.slug]?.score ?? 0)
    );
  }, [tuned, stories, pMap]);

  // Queue-for-later state, per story slug.
  const [queued, setQueued] = useState<Record<string, "idle" | "loading" | "done" | "error">>({});
  async function queue(slug: string) {
    setQueued((q) => ({ ...q, [slug]: "loading" }));
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      setQueued((q) => ({ ...q, [slug]: res.ok ? "done" : "error" }));
    } catch {
      setQueued((q) => ({ ...q, [slug]: "error" }));
    }
  }

  return (
    <>
      <div className="flex justify-end pt-1">
        <Link href="/queue" className="kicker text-subtle hover:text-accent">
          Reading queue →
        </Link>
      </div>

      {/* Mode toggle + transparency */}
      {hasTuning && (
        <section className="rule-double pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-hair p-0.5 bg-paper">
            <button
              onClick={() => setTuned(true)}
              className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
                tuned ? "bg-ink text-paper" : "text-subtle hover:text-ink"
              }`}
              aria-pressed={tuned}
            >
              Tuned to me
            </button>
            <button
              onClick={() => setTuned(false)}
              className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${
                !tuned ? "bg-ink text-paper" : "text-subtle hover:text-ink"
              }`}
              aria-pressed={!tuned}
            >
              Today&rsquo;s edition
            </button>
          </div>
          {profile && (
            <details className="group text-right">
              <summary className="kicker cursor-pointer hover:text-ink list-none">
                Tuned to your current work →
              </summary>
              <div className="mt-2 text-xs text-subtle max-w-sm text-left ml-auto leading-relaxed">
                <p className="text-ink/80">{profile.role}</p>
                {profile.projects.length > 0 && (
                  <p className="mt-1">
                    <span className="kicker">Active projects</span>{" "}
                    {profile.projects.join(" · ")}
                  </p>
                )}
                <p className="mt-1">
                  <span className="kicker">From</span> {profile.sources.join(" · ")}.
                </p>
                <p className="mt-1">
                  <span className="kicker">Privacy</span>{" "}
                  {llm.local ? (
                    <>Read and processed on your machine (LLM: {llm.provider}). Nothing leaves your computer.</>
                  ) : (
                    <>
                      Files are read on your machine; only distilled excerpts are sent to your LLM provider
                      ({llm.provider}) to infer topics. This app stores nothing remotely.
                    </>
                  )}
                </p>
                <Link href="/settings" className="mt-2 inline-block kicker text-accent hover:text-ink">
                  Manage sources &amp; topics →
                </Link>
              </div>
            </details>
          )}
        </section>
      )}

      {!hasTuning && (
        <section className="rule-double pt-4">
          <Link
            href="/settings"
            className="block rounded border border-hair bg-accentSoft/40 px-4 py-3 text-sm hover:border-accent"
          >
            <span className="kicker text-accent">Personalize this feed →</span>{" "}
            Add your GitHub repos, local folders, or Claude sessions and the brief re-ranks itself to
            your current work.
          </Link>
        </section>
      )}

      {/* TL;DR */}
      <section className={hasTuning ? "mt-6" : "rule-double pt-5"}>
        <h2 className="kicker mb-3">
          {tuned ? "Top 5 for your work today" : "The 5 things that matter today"}
        </h2>
        <ol className="space-y-2.5">
          {view.slice(0, 5).map((s, i) => {
            const p = pMap[s.slug];
            return (
              <li key={s.slug} className="flex gap-3">
                <span className="font-serif text-xl font-bold text-accent leading-none w-5 shrink-0">
                  {i + 1}
                </span>
                <a href={`#${s.slug}`} className="text-[0.97rem] leading-snug hover:text-accent">
                  {s.takeaway}
                  <span className="kicker ml-2">
                    {tuned && p?.matchedProject
                      ? p.matchedProject
                      : s.marketMove
                        ? "Market"
                        : sectionLabel(s.section)}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Briefs */}
      <section className="mt-10">
        <h2 className="kicker mb-1">The briefs</h2>
        <div>
          {view.map((s) => {
            const p = tuned ? pMap[s.slug] : undefined;
            return (
              <article key={s.slug} id={s.slug} className="scroll-mt-6 rule-t py-7">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="kicker">
                    {s.marketMove ? "Market move" : sectionLabel(s.section)}
                  </span>
                  <span className="text-hair">·</span>
                  <span className="label">{s.readMinutes} min</span>
                  <span className="text-hair">·</span>
                  <SignalPill level={s.signal.signal} />
                  {p && (
                    <>
                      <span className="text-hair">·</span>
                      <span
                        className={`text-[0.72rem] font-mono uppercase tracking-wide ${
                          p.score >= 60
                            ? "text-signalHigh"
                            : p.score >= 40
                              ? "text-signalMed"
                              : "text-subtle"
                        }`}
                      >
                        {p.score}/100 for you
                      </span>
                    </>
                  )}
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl font-bold leading-[1.1] tracking-tight">
                  {s.headline}
                </h3>
                <p className="mt-2 font-serif text-lg italic text-subtle leading-snug">
                  {s.takeaway}
                </p>

                {p ? (
                  <>
                    <div className="mt-4 bg-accentSoft/50 border-l-2 border-accent pl-3 py-2">
                      <p className="text-[0.97rem] leading-relaxed">
                        <span className="kicker">Why this matters to you</span> {p.whyForYou}
                      </p>
                      {p.doNext && p.doNext.toLowerCase() !== "skip" && (
                        <p className="mt-2 text-[0.95rem] leading-relaxed">
                          <span className="kicker">Do next</span> {p.doNext}
                        </p>
                      )}
                      <p className="mt-2 label">
                        Why you&rsquo;re seeing this: {p.evidence}
                      </p>
                    </div>
                    <p className="mt-3 text-[0.97rem] leading-relaxed border-l-2 border-hair pl-3 text-ink/85">
                      <span className="kicker">Skeptical read</span> {s.skepticalRead}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-4 text-[0.97rem] leading-relaxed">
                      <span className="kicker">Why it matters</span> {s.whyItMatters}
                    </p>
                    <p className="mt-3 text-[0.97rem] leading-relaxed border-l-2 border-accent pl-3 text-ink/85">
                      <span className="kicker">Skeptical read</span> {s.skepticalRead}
                    </p>
                  </>
                )}

                {/* Queue for later — drafts a grounded task */}
                <div className="mt-3 flex items-center gap-3">
                  {queued[s.slug] === "done" ? (
                    <span className="text-xs text-signalHigh font-medium">
                      ✓ Queued ·{" "}
                      <Link href="/queue" className="link-underline text-accent">
                        View queue →
                      </Link>
                    </span>
                  ) : (
                    <button
                      onClick={() => queue(s.slug)}
                      disabled={queued[s.slug] === "loading"}
                      className="text-xs font-medium border border-hair rounded-full px-3 py-1 hover:border-accent hover:text-accent disabled:opacity-60"
                    >
                      {queued[s.slug] === "loading" ? "Drafting task…" : "＋ Queue for later"}
                    </button>
                  )}
                  {queued[s.slug] === "error" && (
                    <span className="text-xs text-signalLow">Couldn&rsquo;t queue — try again.</span>
                  )}
                </div>

                <details className="mt-3 group">
                  <summary className="kicker cursor-pointer select-none hover:text-ink list-none">
                    <span className="group-open:hidden">Full brief →</span>
                    <span className="hidden group-open:inline">Hide full brief ↑</span>
                  </summary>
                  <div className="mt-3 space-y-3 text-[0.95rem] leading-relaxed text-ink/90">
                    <p>
                      <span className="kicker">What happened</span> {s.whatHappened}
                    </p>
                    <p>
                      <span className="kicker">What changed</span> {s.whatChanged}
                    </p>
                    {p && (
                      <p>
                        <span className="kicker">General take</span> {s.whyItMatters}
                      </p>
                    )}
                    <div>
                      <span className="kicker">Who should care</span>{" "}
                      <span className="text-subtle">{s.whoShouldCare.join(" · ")}</span>
                    </div>
                    {s.sources.length > 0 && (
                      <div>
                        <span className="kicker">Sources</span>{" "}
                        {s.sources.map((src, i) => (
                          <span key={src.url}>
                            {i > 0 && <span className="text-hair"> · </span>}
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link-underline text-accent"
                            >
                              {src.label} ↗
                            </a>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
