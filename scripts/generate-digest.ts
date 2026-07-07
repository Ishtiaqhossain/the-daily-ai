/**
 * Daily digest generator — RSS + LLM summarization.
 *
 * Pulls recent items from a set of AI feeds, asks Claude to turn the raw
 * stream into structured Daily AI briefs (what happened / why it matters /
 * skeptical read / signal score), and writes them to
 *   src/content/generated-edition.json
 *
 * Wire the output into the site by importing that JSON in src/content/stories.ts
 * (merge with the hand-written seed array), or have an admin review it first.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... npm run digest
 *
 * Env:
 *   LLM_PROVIDER / LLM_MODEL / *_API_KEY   choose any provider (see scripts/llm.ts).
 *                      Without a configured provider the script just dumps fetched
 *                      headlines so you can see the pipeline works.
 *   DIGEST_MODEL       optional per-stage model override (else LLM_MODEL/default)
 *   DIGEST_MAX_ITEMS   optional, defaults to 12
 */
import Parser from "rss-parser";
import { promises as fs } from "fs";
import path from "path";
import { complete, describe, isConfigured, parseJson } from "../src/lib/llm";

const FEEDS: { source: string; url: string }[] = [
  { source: "Hacker News (front)", url: "https://hnrss.org/frontpage" },
  { source: "arXiv cs.AI", url: "http://export.arxiv.org/rss/cs.AI" },
  // HF's own /papers/feed now 401s; this is a daily AI-papers feed serving the same purpose.
  { source: "Daily AI papers", url: "https://papers.takara.ai/api/feed" },
  { source: "The Decoder", url: "https://the-decoder.com/feed/" },
  { source: "VentureBeat AI", url: "https://venturebeat.com/category/ai/feed/" },
];

// Per-feed cap when balancing the edition (round-robin across feeds).
const PER_FEED = Number(process.env.DIGEST_PER_FEED || 5);

const MODEL = process.env.DIGEST_MODEL; // optional per-stage override
const MAX_ITEMS = Number(process.env.DIGEST_MAX_ITEMS || 12);
const OUT = path.join(process.cwd(), "src", "content", "generated-edition.json");

const SECTIONS = ["models", "agents", "coding", "research", "infra", "startups", "benchmarks", "tools"];

type RawItem = { title: string; link: string; source: string; snippet: string };

async function fetchFeeds(): Promise<RawItem[]> {
  const parser = new Parser({
    timeout: 15000,
    // Some feeds (e.g. arXiv, takara) reject requests without a UA.
    headers: { "User-Agent": "TheAgentLedger/0.1 (+digest)" },
  });

  // Gather up to PER_FEED items from each feed, kept in separate buckets.
  const buckets = await Promise.all(
    FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        const picked = parsed.items.slice(0, PER_FEED).map((it) => ({
          title: it.title?.trim() || "Untitled",
          link: it.link || "",
          source: feed.source,
          snippet: (it.contentSnippet || it.content || "").slice(0, 400).replace(/\s+/g, " ").trim(),
        }));
        console.log(`  ✓ ${feed.source}: ${parsed.items.length} available, took ${picked.length}`);
        return picked;
      } catch (e) {
        console.warn(`  ✗ ${feed.source}: ${(e as Error).message}`);
        return [] as RawItem[];
      }
    })
  );

  // Round-robin interleave so no single source dominates the edition.
  const balanced: RawItem[] = [];
  for (let i = 0; balanced.length < MAX_ITEMS; i++) {
    let addedThisRound = false;
    for (const bucket of buckets) {
      if (bucket[i]) {
        balanced.push(bucket[i]);
        addedThisRound = true;
        if (balanced.length >= MAX_ITEMS) break;
      }
    }
    if (!addedThisRound) break; // all buckets exhausted
  }
  return balanced;
}

const SYSTEM = `You are the desk editor for "The Daily AI", a daily AI briefing for builders, engineering leaders, researchers, and investors.
Your job: turn a raw feed of AI headlines into clean, skeptical briefs. The house style answers three questions: what changed, why it matters, and what to do next.
You are calm, credible, and allergic to hype. The "skepticalRead" must name what could be overhyped, unverified, or unclear — it is the most important field.`;

function userPrompt(items: RawItem[]): string {
  return `Here are today's raw feed items (JSON):

${JSON.stringify(items, null, 2)}

Select the 5 most significant, distinct stories. For each, return a brief.
Respond with ONLY a JSON array (no prose, no markdown fences) of objects with EXACTLY these fields:
{
  "slug": "kebab-case-unique",
  "headline": "string",
  "takeaway": "one sentence",
  "section": one of ${JSON.stringify(SECTIONS)},
  "tags": ["..."],
  "readMinutes": number,
  "date": "${new Date().toISOString().slice(0, 10)}",
  "whatHappened": "2-3 sentences, factual",
  "whyItMatters": "2-3 sentences, practical implications",
  "whatChanged": "compared to the previous state",
  "whoShouldCare": ["roles"],
  "skepticalRead": "what could be overhyped or unverified",
  "signal": { "signal": "High|Medium|Low", "novelty": "High|Medium|Low", "practical": "High|Medium|Low", "hypeRisk": "High|Medium|Low" },
  "sources": [{ "label": "source name", "url": "original link" }]
}`;
}

async function summarize(items: RawItem[]): Promise<unknown> {
  const text = await complete({
    system: SYSTEM,
    prompt: userPrompt(items),
    maxTokens: 4096,
    model: MODEL,
  });
  return parseJson(text);
}

async function main() {
  console.log(`\n📰 The Daily AI — digest run @ ${new Date().toISOString()}\n`);
  console.log("Fetching feeds…");
  const items = await fetchFeeds();
  console.log(`\nFetched ${items.length} items.\n`);

  if (!isConfigured()) {
    console.log("⚠ No LLM provider configured — skipping summarization. Raw headlines:\n");
    items.forEach((it, i) => console.log(`  ${i + 1}. [${it.source}] ${it.title}`));
    console.log(`\nSet LLM_PROVIDER + an API key (see scripts/llm.ts) and re-run for structured briefs.`);
    return;
  }

  console.log(`Summarizing with ${describe(MODEL)}…`);
  const stories = await summarize(items);
  await fs.writeFile(OUT, JSON.stringify(stories, null, 2));
  const count = Array.isArray(stories) ? stories.length : 0;
  console.log(`\n✓ Wrote ${count} briefs to ${path.relative(process.cwd(), OUT)}`);
  console.log(`  Review, then merge into src/content/stories.ts to publish.\n`);
}

main().catch((e) => {
  console.error("\n✗ Digest failed:", e.message);
  process.exit(1);
});
