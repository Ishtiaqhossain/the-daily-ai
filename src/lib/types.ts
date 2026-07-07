export type Level = "High" | "Medium" | "Low";

export type Persona =
  | "Engineering Leader"
  | "Founder"
  | "Developer"
  | "Researcher"
  | "Investor"
  | "Product Manager";

export type SectionSlug =
  | "models"
  | "agents"
  | "coding"
  | "research"
  | "infra"
  | "startups"
  | "benchmarks"
  | "tools";

export interface SignalScore {
  signal: Level;
  novelty: Level;
  practical: Level;
  hypeRisk: Level;
}

export interface Source {
  label: string;
  url: string;
}

export interface Story {
  slug: string;
  headline: string;
  takeaway: string; // one-sentence
  section: SectionSlug;
  tags: string[];
  readMinutes: number;
  date: string; // ISO
  whatHappened: string;
  whyItMatters: string;
  whatChanged: string;
  whoShouldCare: string[];
  skepticalRead: string;
  signal: SignalScore;
  /** Persona-specific implications. Falls back to whyItMatters. */
  personaAngles?: Partial<Record<Persona, string>>;
  sources: Source[];
  related?: { label: string; href: string }[];
  /** Placement hints for the front page. */
  lead?: boolean;
  marketMove?: boolean;
}

export interface RepoCard {
  name: string;
  url: string;
  starsGained: string;
  whatItDoes: string;
  whyBuildersCare: string;
  comparable: string[];
  category: string;
}

export interface BenchmarkUpdate {
  name: string;
  change: string;
  verified: boolean;
  saturated: boolean;
  soWhat: string;
}

export interface AgentWatchItem {
  title: string;
  category: string;
  summary: string;
  buildable: string; // Can I build with this?
  productionReady: string; // Is this production-ready?
  moat: string; // What is the moat?
  demo: string; // What would I demo in an interview?
}

export interface CompanyMapEntry {
  category: string;
  players: string[];
}

export interface TimelineEntry {
  topic: string;
  rows: { year: string; state: string }[];
}

// ---- Personalization ----

export interface InterestSignal {
  label: string;
  kind: "tool" | "topic" | "company" | "technique" | "intent";
  weight: number; // 1-5
  evidence: string;
  pinned?: boolean; // user-edited/added — survives a rebuild
}

export type SourceType = "claude-sessions" | "folder" | "github" | "text";

export interface SourceConfig {
  id: string;
  type: SourceType;
  value: string; // folder path, owner/repo or URL, freeform text ("" for claude-sessions)
  label?: string;
  enabled: boolean;
}

export interface ActiveProject {
  name: string;
  summary: string;
  keywords: string[];
  evidence: string;
}

export interface Profile {
  generatedAt: string;
  roleSignal: string;
  activeProjects: ActiveProject[];
  interests: InterestSignal[];
  sources: string[]; // human-readable list of what was read
  blockedTopics?: string[]; // labels the user deleted; never re-inferred on rebuild
}

/** A brief the reader queued for later, drafted into a grounded task. */
export interface QueuedTask {
  id: string;
  slug: string;
  headline: string;
  takeaway: string;
  section: string;
  source?: { label: string; url: string };
  matchedProject?: string | null;
  // LLM-drafted, project-grounded task (falls back to raw capture w/o a provider):
  taskTitle: string;
  context: string;
  instruction: string;
  drafted: boolean; // true if an LLM grounded it; false = raw capture
  citations?: string[]; // "path:line" refs from agentic code retrieval
  status: "queued" | "done";
  createdAt: string;
}

/** Per-story personalization overlay produced from the Profile. */
export interface Personalized {
  slug: string;
  score: number; // 0-100 relevance to the reader's current work
  matchedProject: string | null;
  whyForYou: string;
  evidence: string; // which signal triggered the match
  doNext: string;
}
