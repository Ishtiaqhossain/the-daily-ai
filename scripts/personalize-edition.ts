/**
 * personalize-edition — turns the generic edition into a "tuned to me" edition.
 *
 * Reads:
 *   src/content/generated-edition.json  (the day's briefs)
 *   data/profile.json                   (your current-work profile)
 * Writes:
 *   src/content/personalized-edition.json
 *     [{ slug, score, matchedProject, whyForYou, evidence, doNext }]
 *
 * The page shows a "Today's edition" ↔ "Tuned to me" toggle; in tuned mode it
 * re-ranks by score and swaps in the per-you "why it matters" + evidence line.
 *
 * Usage:  npm run personalize   (run `npm run profile` first)
 */
import { promises as fs } from "fs";
import path from "path";
import { complete, describe, isConfigured, parseJson } from "../src/lib/llm";

const MODEL = process.env.PERSONALIZE_MODEL; // optional per-stage override
const EDITION = path.join(process.cwd(), "src", "content", "generated-edition.json");
const PROFILE = path.join(process.cwd(), "data", "profile.json");
const OUT = path.join(process.cwd(), "src", "content", "personalized-edition.json");

const SYSTEM = `You personalize an AI news edition for one reader based on a profile of their CURRENT work.
For each story, judge how much it matters to THIS reader's active projects and interests, and rewrite the
implication so it speaks to their actual work — naming the relevant project when there is a real connection.
Be honest: a story unrelated to their work gets a low score and you say so plainly. No flattery, no forcing links.`;

function prompt(profile: any, stories: any[]): string {
  const slim = stories.map((s) => ({
    slug: s.slug,
    headline: s.headline,
    takeaway: s.takeaway,
    section: s.section,
    tags: s.tags,
    whyItMatters: s.whyItMatters,
  }));
  return `READER PROFILE:
Role: ${profile.roleSignal}
Active projects:
${(profile.activeProjects || []).map((p: any) => `- ${p.name}: ${p.summary} [${(p.keywords || []).join(", ")}]`).join("\n")}
Interests (label·kind·weight):
${(profile.interests || []).map((i: any) => `- ${i.label} (${i.kind}, w${i.weight})`).join("\n")}

TODAY'S STORIES:
${JSON.stringify(slim, null, 2)}

For EVERY story, return an object. Respond with ONLY a JSON array (no prose/fences):
[{
  "slug": "match the story",
  "score": 0-100,              // relevance to THIS reader's current work
  "matchedProject": "active project name or null",
  "whyForYou": "2-3 sentences: why it matters to THEIR work specifically. If unrelated, say it's peripheral and why.",
  "evidence": "the profile signal that triggered the match, e.g. 'your main project + interest in MCP'",
  "doNext": "one concrete next action for them (or 'skip' if low relevance)"
}]
Score honestly: 80-100 hits an active project; 50-79 hits an interest; <40 is peripheral.`;
}

async function main() {
  console.log("\n🎯 personalize-edition\n");
  if (!isConfigured()) {
    console.error("✗ No LLM provider configured. Set LLM_PROVIDER + an API key (see scripts/llm.ts).");
    process.exit(1);
  }

  let profile: any, stories: any[];
  try {
    profile = JSON.parse(await fs.readFile(PROFILE, "utf8"));
  } catch {
    console.error("✗ No profile found. Run `npm run profile` first.");
    process.exit(1);
  }
  try {
    stories = JSON.parse(await fs.readFile(EDITION, "utf8"));
  } catch {
    console.error("✗ No edition found. Run `npm run digest` first.");
    process.exit(1);
  }

  console.log(`  Reader: ${profile.roleSignal}`);
  console.log(`  Stories to rank: ${stories.length}\n`);

  console.log(`Ranking + rewriting with ${describe(MODEL)}…`);
  const text = await complete({
    system: SYSTEM,
    prompt: prompt(profile, stories),
    maxTokens: 3072,
    model: MODEL,
  });
  const ranked = parseJson(text) as any[];

  // Keep only entries that map to a real story; sort high→low for the log.
  const slugs = new Set(stories.map((s) => s.slug));
  const clean = ranked.filter((r) => slugs.has(r.slug));
  clean.sort((a, b) => b.score - a.score);

  await fs.writeFile(OUT, JSON.stringify(clean, null, 2));
  console.log(`\n✓ Wrote ${clean.length} personalized entries to ${path.relative(process.cwd(), OUT)}\n`);
  clean.forEach((r) => console.log(`  ${String(r.score).padStart(3)}  ${r.matchedProject ? "[" + r.matchedProject + "] " : ""}${r.slug}`));
  console.log("");
}

main().catch((e) => {
  console.error("\n✗ personalize-edition failed:", e.message);
  process.exit(1);
});
