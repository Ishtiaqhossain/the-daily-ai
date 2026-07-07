import { promises as fs } from "fs";
import path from "path";
import type { Personalized, Story } from "./types";
import { SEED_STORIES, buildEdition } from "@/content/stories";

async function readJsonArray<T>(rel: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), rel), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Load today's edition + personalization at REQUEST time (not build time), so a
 * "Re-rank" from the settings page is reflected on the next page refresh without
 * a rebuild.
 */
export async function loadEdition(): Promise<{ stories: Story[]; personalized: Personalized[] }> {
  const raw = await readJsonArray<Story>("src/content/generated-edition.json");
  const stories = raw.length ? buildEdition(raw) : SEED_STORIES;
  const personalized = await readJsonArray<Personalized>("src/content/personalized-edition.json");
  return { stories, personalized };
}
