import { promises as fs } from "fs";
import path from "path";
import type { Profile, QueuedTask, SourceConfig } from "./types";

const DATA = path.join(process.cwd(), "data");
export const PROFILE_FILE = path.join(DATA, "profile.json");
export const SOURCES_FILE = path.join(DATA, "sources.json");
export const QUEUE_FILE = path.join(DATA, "queue.json");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// Default sources used until the user configures their own.
export const DEFAULT_SOURCES: SourceConfig[] = [
  { id: "claude", type: "claude-sessions", value: "", label: "Recent Claude sessions", enabled: true },
  { id: "thisproject", type: "folder", value: ".", label: "This project", enabled: true },
];

export async function getSources(): Promise<SourceConfig[]> {
  const cfg = await readJson<{ sources: SourceConfig[] }>(SOURCES_FILE, { sources: DEFAULT_SOURCES });
  return cfg.sources?.length ? cfg.sources : DEFAULT_SOURCES;
}

export async function saveSources(sources: SourceConfig[]): Promise<void> {
  await writeJson(SOURCES_FILE, { sources });
}

export async function getProfile(): Promise<Profile | null> {
  return readJson<Profile | null>(PROFILE_FILE, null);
}

export async function saveProfile(profile: Profile): Promise<void> {
  await writeJson(PROFILE_FILE, profile);
}

export async function getQueue(): Promise<QueuedTask[]> {
  const q = await readJson<{ items: QueuedTask[] }>(QUEUE_FILE, { items: [] });
  return q.items ?? [];
}

export async function saveQueue(items: QueuedTask[]): Promise<void> {
  await writeJson(QUEUE_FILE, { items });
}
