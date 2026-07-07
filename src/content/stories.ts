import type { Story } from "@/lib/types";

// Seed edition. Used as a fallback when no generated edition is present.
export const SEED_STORIES: Story[] = [
  {
    slug: "agentic-coding-becomes-team-infrastructure",
    headline: "Agentic coding tools are becoming team infrastructure",
    takeaway:
      "The fight is no longer autocomplete vs. chat — it's repo access, evals, security, and governance.",
    section: "coding",
    tags: ["coding agents", "platform", "governance"],
    readMinutes: 4,
    date: "2026-06-29",
    lead: true,
    whatHappened:
      "Multiple vendors shipped repo-level collaboration for coding agents this week: shared agent sessions, org-wide policy controls, and audit logs for agent-authored changes. What started as a solo developer tool is being repackaged as a platform layer that engineering orgs adopt centrally.",
    whyItMatters:
      "When a coding agent can read and modify a whole repo on behalf of a team, the buying decision moves up from the individual developer to the platform and security org. That changes pricing, procurement, and the competitive moat.",
    whatChanged:
      "Six months ago the differentiator was completion quality. Now it's permissioning, sandboxing, eval harnesses, and the ability to prove what an agent did and why. Capability is being commoditized; control is the new surface.",
    whoShouldCare: [
      "Engineering managers",
      "Platform teams",
      "Dev productivity teams",
      "Security & compliance",
    ],
    skepticalRead:
      "\"Team workflow\" can be a euphemism for seat expansion. Few of these governance features are battle-tested, and audit logs of agent actions are only as useful as the review process around them. Watch for governance theater that ships faster than real controls.",
    signal: { signal: "High", novelty: "Medium", practical: "High", hypeRisk: "Medium" },
    personaAngles: {
      "Engineering Leader":
        "This is your platform decision for the next 18 months. Evaluate on permissioning, sandboxing, and auditability — not demo quality. Standardize one runtime before shadow adoption forks your toolchain.",
      Founder:
        "If you're building dev tools, the wedge is no longer code quality — it's the control plane. Sell to the platform org, not the IC.",
      Developer:
        "Expect more guardrails and less raw freedom. The upside: agents that can safely touch the whole repo, not just your open file.",
      Investor:
        "Margins and lock-in move to whoever owns governance and the eval layer. Completion-only tools are a feature, not a company.",
      Researcher:
        "The open problem is verifiable agent behavior at repo scale — provable diffs, not vibes.",
      "Product Manager":
        "Roadmap the boring parts: roles, approvals, and audit. That's what closes enterprise deals now.",
    },
    sources: [
      { label: "Vendor release notes (roundup)", url: "https://example.com/coding-agents" },
      { label: "Hacker News discussion", url: "https://news.ycombinator.com" },
    ],
    related: [
      { label: "Compare: Claude Code vs Cursor vs Codex-style agents", href: "/compare" },
      { label: "Timeline: AI coding agents", href: "/timeline" },
    ],
  },
  {
    slug: "open-weight-model-closes-frontier-gap",
    headline: "New open-weight model narrows the frontier gap on reasoning",
    takeaway:
      "An open release lands within striking distance of closed frontier models on hard reasoning evals.",
    section: "models",
    tags: ["open weights", "reasoning", "frontier"],
    readMinutes: 3,
    date: "2026-06-29",
    whatHappened:
      "A new open-weight model posted frontier-adjacent scores on competition math and code reasoning benchmarks, released under a permissive license with published weights and a technical report.",
    whyItMatters:
      "Open weights at near-frontier reasoning reset the build-vs-buy math for teams that need on-prem, fine-tuning, or cost control. It pressures closed providers on price and pushes differentiation toward tooling and reliability.",
    whatChanged:
      "The open/closed reasoning gap has compressed from quarters to weeks on several public evals. The remaining gap is increasingly about long-horizon agentic reliability, not single-turn quality.",
    whoShouldCare: ["Platform teams", "ML engineers", "Cost owners", "Researchers"],
    skepticalRead:
      "Benchmark-adjacent isn't production-adjacent. Public reasoning scores rarely capture tool-use reliability, latency under load, or failure modes on messy real inputs. Treat the headline number as a ceiling, not a baseline.",
    signal: { signal: "High", novelty: "High", practical: "Medium", hypeRisk: "Medium" },
    sources: [
      { label: "Model card", url: "https://huggingface.co" },
      { label: "Technical report (arXiv)", url: "https://arxiv.org" },
    ],
    related: [{ label: "Benchmark Watch", href: "/benchmark-watch" }],
  },
  {
    slug: "mcp-servers-as-the-new-api-layer",
    headline: "MCP servers are quietly becoming the new integration layer",
    takeaway:
      "Tool-calling via standardized servers is turning point integrations into a reusable substrate.",
    section: "agents",
    tags: ["MCP", "tool calling", "integration"],
    readMinutes: 3,
    date: "2026-06-29",
    whatHappened:
      "A wave of first-party and community MCP servers shipped this week, exposing internal systems to agents through a common protocol instead of bespoke function-calling glue.",
    whyItMatters:
      "If MCP becomes the default way agents reach tools, integration value accrues to whoever owns the servers and registries — much like the API economy a decade ago, but agent-native.",
    whatChanged:
      "Teams are moving from per-app tool definitions to shared MCP servers with auth, discovery, and observability built in. The unit of integration is shifting from a function to a server.",
    whoShouldCare: ["Platform teams", "Integration engineers", "Founders", "Product teams"],
    skepticalRead:
      "Protocol momentum is not the same as production maturity. Auth, multi-tenancy, and observability for MCP are still uneven, and a registry land-grab could fragment before it standardizes.",
    signal: { signal: "Medium", novelty: "High", practical: "Medium", hypeRisk: "Medium" },
    sources: [
      { label: "MCP registry roundup", url: "https://example.com/mcp" },
    ],
    related: [{ label: "Agent Watch: MCP servers", href: "/agent-watch" }],
  },
  {
    slug: "swe-bench-verified-saturation-debate",
    headline: "SWE-bench scores keep climbing — and the saturation debate heats up",
    takeaway:
      "Top agents post record SWE-bench numbers as critics question what the benchmark still measures.",
    section: "benchmarks",
    tags: ["SWE-bench", "evals", "coding"],
    readMinutes: 3,
    date: "2026-06-29",
    whatHappened:
      "Several coding agents reported new highs on SWE-bench Verified, prompting renewed debate about contamination, overfitting to the harness, and whether the benchmark reflects real maintenance work.",
    whyItMatters:
      "Buyers increasingly procure coding agents on benchmark scores. If the benchmark is saturating or gameable, those numbers stop predicting real-world value — and someone ships the wrong tool.",
    whatChanged:
      "The conversation moved from 'who scores highest' to 'does this number survive independent verification on held-out, realistic tasks?'",
    whoShouldCare: ["Engineering leaders", "ML evaluators", "Buyers", "Researchers"],
    skepticalRead:
      "Both sides overclaim. A high score isn't fraud, and skepticism isn't proof of gaming. The honest answer needs held-out tasks and independent runs — which most vendor blog posts don't provide.",
    signal: { signal: "Medium", novelty: "Medium", practical: "High", hypeRisk: "High" },
    sources: [
      { label: "Leaderboard", url: "https://www.swebench.com" },
      { label: "Critique thread", url: "https://news.ycombinator.com" },
    ],
    related: [{ label: "Benchmark Watch", href: "/benchmark-watch" }],
  },
  {
    slug: "ai-infra-startup-raises-mega-round",
    headline: "AI inference-infra startup raises a large round to undercut on serving costs",
    takeaway: "Fresh capital targets cheaper, faster serving as the next competitive battleground.",
    section: "startups",
    tags: ["funding", "infra", "inference"],
    readMinutes: 2,
    date: "2026-06-29",
    marketMove: true,
    whatHappened:
      "An inference-infrastructure company announced a large funding round to scale low-latency, lower-cost model serving and tooling for agent workloads.",
    whyItMatters:
      "Serving cost is now a primary lever for anyone running agents at scale. Capital flowing here signals that the bottleneck has moved from model quality to economics and reliability.",
    whatChanged:
      "Investor attention is rotating from training frontier models to making inference cheap, observable, and reliable for production agent traffic.",
    whoShouldCare: ["Cost owners", "Platform teams", "Investors", "Founders"],
    skepticalRead:
      "Serving is a brutal, low-margin business with strong incumbents. A big round buys runway, not a moat — watch gross margins and retention, not the headline valuation.",
    signal: { signal: "Medium", novelty: "Low", practical: "Medium", hypeRisk: "Medium" },
    sources: [{ label: "Funding announcement", url: "https://example.com/funding" }],
  },
  {
    slug: "long-context-eval-reveals-recall-cliffs",
    headline: "New long-context eval exposes recall cliffs past the advertised window",
    takeaway:
      "Models accept huge contexts but reliably use far less — and a new eval quantifies where they break.",
    section: "research",
    tags: ["long context", "evals", "reliability"],
    readMinutes: 3,
    date: "2026-06-29",
    whatHappened:
      "Researchers published an eval showing sharp recall degradation well before models' maximum context lengths, with task-dependent cliffs that headline 'needle-in-a-haystack' tests miss.",
    whyItMatters:
      "Teams build RAG and agent memory assuming the full advertised window is usable. This eval gives a concrete reason to chunk, rank, and verify rather than trust raw context size.",
    whatChanged:
      "Long-context marketing claims now have an independent counter-measure that tests real multi-fact reasoning, not just single-token retrieval.",
    whoShouldCare: ["RAG builders", "Agent engineers", "Researchers", "Platform teams"],
    skepticalRead:
      "One eval is not the verdict. Methodology and prompt formatting heavily affect long-context results — reproduce on your own workload before re-architecting your retrieval stack.",
    signal: { signal: "Medium", novelty: "High", practical: "High", hypeRisk: "Low" },
    sources: [{ label: "Paper (arXiv)", url: "https://arxiv.org" }],
    related: [{ label: "Benchmark Watch", href: "/benchmark-watch" }],
  },
];

// Words that mark a story as a market/industry move (funding, M&A, etc.).
const MARKET_RE = /\b(raises?|raised|series [a-e]|funding|round|acquir|acquisition|layoff|ipo|valuation)\b/i;

function isMarketMove(s: Story): boolean {
  return (
    s.section === "startups" ||
    MARKET_RE.test(s.headline) ||
    s.tags.some((t) => MARKET_RE.test(t))
  );
}

/**
 * Enrich the LLM-generated edition with the placement flags the front page
 * needs (lead + marketMove), which the digest doesn't set. The first story is
 * the lead; funding/M&A stories go to the Market desk.
 */
export function buildEdition(raw: Story[]): Story[] {
  return raw.map((s, i) => ({
    ...s,
    lead: i === 0,
    marketMove: i !== 0 && isMarketMove(s),
  }));
}

