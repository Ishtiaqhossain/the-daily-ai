/**
 * build-profile — interest profiler over user-configured sources.
 *
 * Reads the sources listed in data/sources.json (managed from the /settings page):
 *   - claude-sessions : recent Claude Code transcripts (your prompts only)
 *   - folder          : a local project folder (deps + README + file tree)
 *   - github          : a public GitHub repo (description, topics, README)
 *   - text            : freeform "what I'm working on" text
 *
 * Runs one LLM extraction pass and writes a current-work profile to data/profile.json.
 * Interests you pinned/edited in the UI (pinned: true) are preserved across rebuilds.
 *
 * Usage:  npm run profile
 */
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { complete, describe, isConfigured, parseJson } from "../src/lib/llm";

const MODEL = process.env.PROFILE_MODEL; // optional per-stage override
const MAX_SESSIONS = Number(process.env.PROFILE_SESSIONS || 6);
const MAX_CHARS = Number(process.env.PROFILE_MAX_CHARS || 45000);
const DATA = path.join(process.cwd(), "data");
const OUT = path.join(DATA, "profile.json");
const SOURCES = path.join(DATA, "sources.json");

type SourceType = "claude-sessions" | "folder" | "github" | "text";
interface SourceConfig {
  id: string;
  type: SourceType;
  value: string;
  label?: string;
  enabled: boolean;
}

const DEFAULT_SOURCES: SourceConfig[] = [
  { id: "claude", type: "claude-sessions", value: "", label: "Recent Claude sessions", enabled: true },
  { id: "thisproject", type: "folder", value: ".", label: "This project", enabled: true },
];

async function loadSources(): Promise<SourceConfig[]> {
  try {
    const cfg = JSON.parse(await fs.readFile(SOURCES, "utf8"));
    return (cfg.sources?.length ? cfg.sources : DEFAULT_SOURCES).filter((s: SourceConfig) => s.enabled);
  } catch {
    return DEFAULT_SOURCES;
  }
}

// ---- per-source readers ----

type FileInfo = { path: string; mtime: number };

async function walkJsonl(dir: string, acc: FileInfo[]): Promise<void> {
  let entries: Array<{ name: string; isDirectory: () => boolean }>;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walkJsonl(full, acc);
    else if (e.name.endsWith(".jsonl")) {
      try {
        const st = await fs.stat(full);
        acc.push({ path: full, mtime: st.mtimeMs });
      } catch {
        /* ignore */
      }
    }
  }
}

function userMessages(jsonl: string): string[] {
  const out: string[] = [];
  for (const line of jsonl.split("\n")) {
    if (!line.trim()) continue;
    let o: any;
    try {
      o = JSON.parse(line);
    } catch {
      continue;
    }
    if (o.type !== "user") continue;
    const c = o.message?.content;
    let text = "";
    if (typeof c === "string") text = c;
    else if (Array.isArray(c)) text = c.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    text = text.trim();
    if (!text || text.startsWith("<") || text.length < 8) continue;
    out.push(text);
  }
  return out;
}

async function readClaudeSessions(): Promise<string> {
  const root = path.join(os.homedir(), ".claude", "projects");
  const files: FileInfo[] = [];
  await walkJsonl(root, files);
  files.sort((a, b) => b.mtime - a.mtime);
  const blocks: string[] = [];
  let total = 0;
  for (const f of files.slice(0, MAX_SESSIONS)) {
    if (total >= MAX_CHARS) break;
    const raw = await fs.readFile(f.path, "utf8").catch(() => "");
    const msgs = userMessages(raw);
    if (!msgs.length) continue;
    const slice = msgs.slice(-12).join("\n---\n");
    const label = path.basename(path.dirname(f.path)).replace(/^-/, "/").replace(/-/g, "/");
    blocks.push(`Session ${label}:\n${slice}`);
    total += slice.length;
  }
  return blocks.join("\n\n").slice(0, MAX_CHARS);
}

async function readFolder(dir: string): Promise<string> {
  const root = path.resolve(process.cwd(), dir || ".");
  const parts: string[] = [];
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8"));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    parts.push(`Name: ${pkg.name || path.basename(root)}`);
    if (deps.length) parts.push(`Dependencies: ${deps.join(", ")}`);
  } catch {
    /* not a node project */
  }
  // Other manifests
  for (const man of ["pyproject.toml", "requirements.txt", "go.mod", "Cargo.toml", "build.gradle", "build.gradle.kts", "pom.xml"]) {
    const c = await fs.readFile(path.join(root, man), "utf8").catch(() => "");
    if (c) parts.push(`${man}:\n${c.slice(0, 800)}`);
  }
  const readme =
    (await fs.readFile(path.join(root, "README.md"), "utf8").catch(() => "")) ||
    (await fs.readFile(path.join(root, "readme.md"), "utf8").catch(() => ""));
  if (readme) parts.push(`README (excerpt):\n${readme.slice(0, 2500)}`);
  // Top-level structure
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const names = entries.filter((e) => !e.name.startsWith(".") && e.name !== "node_modules").map((e) => e.name + (e.isDirectory() ? "/" : ""));
    if (names.length) parts.push(`Contents: ${names.slice(0, 40).join(", ")}`);
  } catch {
    /* ignore */
  }
  if (!parts.length) return `(folder ${root}: nothing readable)`;
  return parts.join("\n");
}

function parseRepo(value: string): string | null {
  const m = value.trim().match(/(?:github\.com[/:])?([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
  if (!m) return null;
  return `${m[1]}/${m[2]}`;
}

async function readGithub(value: string): Promise<string> {
  const repo = parseRepo(value);
  if (!repo) return `(could not parse GitHub repo from "${value}")`;
  const headers = { "User-Agent": "TheAgentLedger", Accept: "application/vnd.github+json" };
  const parts: string[] = [`Repo: ${repo}`];
  try {
    const meta = await fetch(`https://api.github.com/repos/${repo}`, { headers }).then((r) => (r.ok ? r.json() : null));
    if (meta) {
      if (meta.description) parts.push(`Description: ${meta.description}`);
      if (meta.language) parts.push(`Language: ${meta.language}`);
      if (meta.topics?.length) parts.push(`Topics: ${meta.topics.join(", ")}`);
    }
    const readme = await fetch(`https://api.github.com/repos/${repo}/readme`, {
      headers: { ...headers, Accept: "application/vnd.github.raw" },
    }).then((r) => (r.ok ? r.text() : ""));
    if (readme) parts.push(`README (excerpt):\n${readme.slice(0, 2500)}`);
  } catch (e) {
    parts.push(`(fetch failed: ${(e as Error).message})`);
  }
  return parts.join("\n");
}

async function gatherSource(s: SourceConfig): Promise<string> {
  let body = "";
  if (s.type === "claude-sessions") body = await readClaudeSessions();
  else if (s.type === "folder") body = await readFolder(s.value);
  else if (s.type === "github") body = await readGithub(s.value);
  else if (s.type === "text") body = s.value;
  const head = `== SOURCE: ${s.label || s.type} (${s.type}${s.value ? `: ${s.value}` : ""}) ==`;
  return `${head}\n${body}`.slice(0, MAX_CHARS);
}

// ---- extraction ----

const SYSTEM = `You build a concise "current work" profile for a person, used to personalize an AI news feed.
You infer what they are ACTIVELY working on and care about RIGHT NOW from their work signals.
Favor recency and specificity. Distill — do not copy raw text. Output strictly the requested JSON.`;

function prompt(signals: string): string {
  return `Here are work signals for one person, from one or more sources.

${signals || "(none)"}

From these, infer the person's current work. Respond with ONLY this JSON (no prose, no fences):
{
  "roleSignal": "one line: their apparent role and focus",
  "activeProjects": [
    { "name": "short name", "summary": "1 sentence on what they're building", "keywords": ["..."], "evidence": "which source showed this" }
  ],
  "interests": [
    { "label": "specific tool/topic/company/technique", "kind": "tool|topic|company|technique|intent", "weight": 1-5, "evidence": "short" }
  ]
}
Rules: 1-5 activeProjects, 6-16 interests. weight reflects how central/current it is (5 = working on it now). Be specific ("MCP servers", "agent evals") not generic ("AI").`;
}

async function main() {
  console.log("\n🧭 build-profile — reading configured sources\n");
  if (!isConfigured()) {
    console.error("✗ No LLM provider configured. Set LLM_PROVIDER + an API key (see scripts/llm.ts).");
    process.exit(1);
  }

  const sources = await loadSources();
  console.log(`  Sources (${sources.length}):`);
  sources.forEach((s) => console.log(`    · ${s.label || s.type} [${s.type}${s.value ? ` ${s.value}` : ""}]`));

  const gathered = await Promise.all(sources.map(gatherSource));
  const signals = gathered.join("\n\n").slice(0, MAX_CHARS * 1.5);
  console.log(`  Signal text: ${signals.length} chars\n`);

  console.log(`Extracting profile with ${describe(MODEL)}…`);
  const text = await complete({ system: SYSTEM, prompt: prompt(signals), maxTokens: 2048, model: MODEL });
  const parsed = parseJson(text) as any;

  // Preserve interests the user pinned/edited, and never re-infer ones they deleted.
  let pinned: any[] = [];
  let blockedTopics: string[] = [];
  try {
    const existing = JSON.parse(await fs.readFile(OUT, "utf8"));
    pinned = (existing.interests || []).filter((i: any) => i.pinned);
    blockedTopics = existing.blockedTopics || [];
  } catch {
    /* no prior profile */
  }
  const pinnedLabels = new Set(pinned.map((i) => i.label.toLowerCase()));
  const blocked = new Set(blockedTopics.map((b) => b.toLowerCase()));
  const fresh = (parsed.interests || []).filter((i: any) => {
    const l = (i.label || "").toLowerCase();
    return !pinnedLabels.has(l) && !blocked.has(l);
  });

  const profile = {
    generatedAt: new Date().toISOString(),
    roleSignal: parsed.roleSignal || "",
    activeProjects: parsed.activeProjects || [],
    interests: [...pinned, ...fresh],
    sources: sources.map((s) => s.label || s.type),
    blockedTopics,
  };

  await fs.mkdir(DATA, { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(profile, null, 2));

  console.log(`\n✓ Profile written to ${path.relative(process.cwd(), OUT)}`);
  console.log(`  Role: ${profile.roleSignal}`);
  console.log(`  Active projects: ${profile.activeProjects.map((p: any) => p.name).join(", ")}`);
  console.log(`  Interests: ${profile.interests.length} (${pinned.length} pinned kept)`);
  console.log(`  Top: ${profile.interests.slice(0, 8).map((i: any) => i.label).join(", ")}\n`);
}

main().catch((e) => {
  console.error("\n✗ build-profile failed:", e.message);
  process.exit(1);
});
