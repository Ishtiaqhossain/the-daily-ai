import type { Personalized, Profile, Story } from "./types";
import { complete, describe, isConfigured, parseJson } from "./llm";

export interface DraftedTask {
  taskTitle: string;
  context: string;
  instruction: string;
  drafted: boolean;
}

const SYSTEM = `You turn an AI-news brief into a single, concrete task for the reader to act on later, grounded in their current work.
Be specific and practical. The instruction must be one actionable step tied to their project when there is a real connection — never generic "read more". No hype.
When a CODE CONTEXT block is provided, reference the specific file(s) (as path:line) in the instruction where it genuinely applies — do not invent files.`;

function prompt(
  story: Story,
  p: Personalized | undefined,
  profile: Profile | null,
  code?: string
): string {
  return `READER:
Role: ${profile?.roleSignal || "(unknown)"}
${p?.matchedProject ? `Relevant project: ${p.matchedProject}` : ""}
${p?.whyForYou ? `Why it matters to them: ${p.whyForYou}` : ""}
${p?.doNext ? `Suggested next step: ${p.doNext}` : ""}

BRIEF:
Headline: ${story.headline}
Takeaway: ${story.takeaway}
What happened: ${story.whatHappened}
Why it matters: ${story.whyItMatters}
${code ? `\nCODE CONTEXT (from grepping the reader's repo — cite path:line where relevant):\n${code}` : ""}

Return ONLY JSON (no prose/fences):
{
  "taskTitle": "imperative, <= 10 words",
  "context": "1-2 sentences: why this is worth their time, referencing their project/code if relevant",
  "instruction": "one concrete action they (or their coding agent) can take${code ? ", citing path:line from CODE CONTEXT when it applies" : ""}"
}`;
}

export async function draftTask(
  story: Story,
  personalized: Personalized | undefined,
  profile: Profile | null,
  codeContext?: string
): Promise<DraftedTask> {
  if (!isConfigured()) {
    // Graceful fallback: raw capture using what we already have.
    return {
      taskTitle: `Read: ${story.headline}`,
      context: story.takeaway,
      instruction: personalized?.doNext && personalized.doNext.toLowerCase() !== "skip"
        ? personalized.doNext
        : story.whyItMatters,
      drafted: false,
    };
  }
  try {
    const text = await complete({
      system: SYSTEM,
      prompt: prompt(story, personalized, profile, codeContext),
      maxTokens: 512,
    });
    const j = parseJson<Partial<DraftedTask>>(text);
    return {
      taskTitle: (j.taskTitle || `Read: ${story.headline}`).trim(),
      context: (j.context || story.takeaway).trim(),
      instruction: (j.instruction || story.whyItMatters).trim(),
      drafted: true,
    };
  } catch {
    // If the model call/parse fails, still queue something useful.
    return {
      taskTitle: `Read: ${story.headline}`,
      context: story.takeaway,
      instruction: personalized?.doNext || story.whyItMatters,
      drafted: false,
    };
  }
}

export const draftModelLabel = () => (isConfigured() ? describe() : "raw capture");
