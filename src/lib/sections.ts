import type { SectionSlug, Persona } from "./types";

export const SECTIONS: { slug: SectionSlug; label: string; blurb: string }[] = [
  { slug: "models", label: "Models", blurb: "Frontier and open-weight model releases." },
  { slug: "agents", label: "Agents", blurb: "Runtimes, tool calling, orchestration." },
  { slug: "coding", label: "Coding", blurb: "Agentic coding tools and dev workflows." },
  { slug: "research", label: "Research", blurb: "Papers worth your reading time." },
  { slug: "infra", label: "Infra", blurb: "Compute, serving, and the AI stack." },
  { slug: "startups", label: "Startups", blurb: "Funding, acquisitions, company moves." },
  { slug: "benchmarks", label: "Benchmarks", blurb: "Evals and what the numbers mean." },
  { slug: "tools", label: "Tools", blurb: "Things you can pick up and use today." },
];

export const NAV: { label: string; href: string }[] = [
  { label: "Today", href: "/" },
  { label: "Models", href: "/section/models" },
  { label: "Agents", href: "/section/agents" },
  { label: "Coding", href: "/section/coding" },
  { label: "Research", href: "/section/research" },
  { label: "Infra", href: "/section/infra" },
  { label: "Startups", href: "/section/startups" },
  { label: "Benchmarks", href: "/benchmark-watch" },
  { label: "Tools", href: "/builder-radar" },
  { label: "Weekly Brief", href: "/weekly" },
];

export const PERSONAS: Persona[] = [
  "Engineering Leader",
  "Founder",
  "Developer",
  "Researcher",
  "Investor",
  "Product Manager",
];

export const DEFAULT_PERSONA: Persona = "Engineering Leader";

export function sectionLabel(slug: SectionSlug): string {
  return SECTIONS.find((s) => s.slug === slug)?.label ?? slug;
}
