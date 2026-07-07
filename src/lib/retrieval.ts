import { promises as fs } from "fs";
import path from "path";
import { spawn } from "child_process";
import { getSources } from "./store";
import { complete, isConfigured, parseJson } from "./llm";
import type { Profile, Story } from "./types";

/**
 * Agentic tool retrieval over the reader's LOCAL folder sources.
 *
 * Instead of embedding the codebase, the model proposes keyword searches, we run
 * grep/ripgrep (no shell — args only), read a little context around the top hits,
 * and hand the snippets back so the drafted task can cite real files. Provider-
 * agnostic: it's just two plain completions with a grep in between.
 */

export interface Snippet {
  file: string; // repo-relative "root:path"
  line: number;
  text: string;
}
export interface Retrieved {
  block: string; // formatted context for the prompt
  files: string[]; // "path:line" citations
}

// "data" holds this app's own store (profile, queue, subscriber emails) — never code.
const IGNORE = ["node_modules", ".git", ".next", "dist", "build", ".turbo", ".venv", "__pycache__", "data"];
// Files never searched or read — secrets, lockfile noise, and the app's generated
// content. grep (unlike ripgrep) ignores neither .gitignore nor dotfiles, so these
// excludes are load-bearing.
const IGNORE_FILE_GLOBS = [
  "*.lock", "*.pem", "*.key", ".env*",
  "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
  "generated-edition.json", "personalized-edition.json", "*.log",
  "*.tsbuildinfo", "*.map", "*.lock.json",
];
const MAX_MATCHES = 24;
const SEARCH_TIMEOUT = 5000;

/** Hard guard: never surface secrets/lockfiles even if a search slips one through. */
function isSensitive(rel: string): boolean {
  const base = path.basename(rel).toLowerCase();
  return (
    base.startsWith(".env") ||
    base.endsWith(".lock") ||
    base.endsWith(".pem") ||
    base.endsWith(".key") ||
    base.includes("secret") ||
    base === "package-lock.json" ||
    base === "pnpm-lock.yaml" ||
    base === "yarn.lock"
  );
}

/** Absolute, existing directories from enabled `folder` sources. */
export async function searchRoots(): Promise<string[]> {
  const sources = await getSources();
  const roots = new Set<string>();
  for (const s of sources) {
    if (!s.enabled || s.type !== "folder") continue;
    const abs = path.resolve(process.cwd(), s.value || ".");
    try {
      if ((await fs.stat(abs)).isDirectory()) roots.add(abs);
    } catch {
      /* missing dir */
    }
  }
  return [...roots];
}

function run(cmd: string, args: string[]): Promise<string | null> {
  return new Promise((resolve) => {
    let out = "";
    let child;
    try {
      child = spawn(cmd, args);
    } catch {
      return resolve(null);
    }
    const timer = setTimeout(() => child.kill("SIGKILL"), SEARCH_TIMEOUT);
    child.stdout.on("data", (d) => (out += d));
    child.on("error", () => {
      clearTimeout(timer);
      resolve(null); // e.g. ENOENT (binary not installed)
    });
    child.on("close", () => {
      clearTimeout(timer);
      resolve(out);
    });
  });
}

/** Fixed-string search for one query under one root. Prefers ripgrep, falls back to grep. */
async function grep(query: string, root: string): Promise<Snippet[]> {
  const rgArgs = [
    "-n", "-i", "-F", "--no-heading", "--max-count", "3",
    ...IGNORE.flatMap((d) => ["-g", `!${d}/`]),
    ...IGNORE_FILE_GLOBS.flatMap((g) => ["-g", `!${g}`]),
    "-e", query, root,
  ];
  let out = await run("rg", rgArgs);
  if (out == null) {
    const grepArgs = [
      "-rInF", "--max-count=3",
      ...IGNORE.map((d) => `--exclude-dir=${d}`),
      ...IGNORE_FILE_GLOBS.map((g) => `--exclude=${g}`),
      query, root,
    ];
    out = await run("grep", grepArgs);
  }
  if (!out) return [];
  const snippets: Snippet[] = [];
  for (const line of out.split("\n")) {
    if (!line.trim()) continue;
    // format: <path>:<line>:<text>
    const first = line.indexOf(":");
    const second = line.indexOf(":", first + 1);
    if (first < 0 || second < 0) continue;
    const file = line.slice(0, first);
    const ln = Number(line.slice(first + 1, second));
    const text = line.slice(second + 1).trim().slice(0, 200);
    if (!Number.isFinite(ln)) continue;
    const rel = path.relative(root, file) || path.basename(file);
    if (isSensitive(rel)) continue; // belt-and-suspenders
    snippets.push({ file: rel, line: ln, text });
  }
  return snippets;
}

/** Read a small window around a matched line, path-checked to stay inside `root`. */
async function readAround(root: string, rel: string, line: number): Promise<string> {
  if (isSensitive(rel)) return "";
  const abs = path.resolve(root, rel);
  if (!abs.startsWith(path.resolve(root))) return ""; // no traversal
  try {
    const lines = (await fs.readFile(abs, "utf8")).split("\n");
    const from = Math.max(0, line - 3);
    const to = Math.min(lines.length, line + 2);
    return lines.slice(from, to).join("\n").slice(0, 500);
  } catch {
    return "";
  }
}

async function planQueries(story: Story, profile: Profile | null): Promise<string[]> {
  const projects = (profile?.activeProjects || []).map((p) => p.name).join(", ");
  const prompt = `An AI news item may relate to code in the reader's own projects (${projects || "unknown"}).
News: ${story.headline} — ${story.takeaway} [${story.tags.join(", ")}]

Propose keyword searches to find where their codebase touches this topic. Prefer single tokens:
identifiers, library/tool names, filenames. Respond ONLY as JSON: { "queries": ["...", "..."] } (2-4 items).`;
  try {
    const text = await complete({ prompt, maxTokens: 200 });
    const j = parseJson<{ queries?: string[] }>(text);
    return (j.queries || []).map((q) => String(q).trim()).filter(Boolean).slice(0, 4);
  } catch {
    return story.tags.slice(0, 3);
  }
}

/** Full retrieval: plan → grep across roots → read windows → format. */
export async function retrieveCode(story: Story, profile: Profile | null): Promise<Retrieved | null> {
  if (!isConfigured()) return null;
  const roots = await searchRoots();
  if (roots.length === 0) return null;

  const queries = await planQueries(story, profile);
  if (queries.length === 0) return null;

  const seen = new Set<string>();
  const hits: { root: string; s: Snippet }[] = [];
  for (const root of roots) {
    for (const q of queries) {
      for (const s of await grep(q, root)) {
        const key = `${s.file}:${s.line}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({ root, s });
        if (hits.length >= MAX_MATCHES) break;
      }
      if (hits.length >= MAX_MATCHES) break;
    }
    if (hits.length >= MAX_MATCHES) break;
  }
  if (hits.length === 0) return null;

  // Read context around the top matches for the prompt.
  const top = hits.slice(0, 8);
  const blocks: string[] = [];
  for (const { root, s } of top) {
    const window = await readAround(root, s.file, s.line);
    blocks.push(`${s.file}:${s.line}\n${window || s.text}`);
  }
  const files = hits.slice(0, 6).map((h) => `${h.s.file}:${h.s.line}`);
  return {
    block: blocks.join("\n---\n"),
    files,
  };
}
