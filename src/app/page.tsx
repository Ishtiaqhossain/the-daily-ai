import { promises as fs } from "fs";
import path from "path";
import { loadEdition } from "@/lib/edition";
import { getLlmInfo } from "@/lib/llmInfo";
import { SignupForm } from "@/components/SignupForm";
import { Edition } from "@/components/Edition";

// Read edition + personalization fresh each request so re-rank shows on refresh.
export const dynamic = "force-dynamic";

function today() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function readProfileSummary() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "data", "profile.json"), "utf8");
    const p = JSON.parse(raw);
    return {
      role: p.roleSignal ?? "",
      projects: (p.activeProjects ?? []).map((x: { name: string }) => x.name),
      sources: p.sources ?? [],
    };
  } catch {
    return null;
  }
}

export default async function Home() {
  const [profile, { stories, personalized }] = await Promise.all([
    readProfileSummary(),
    loadEdition(),
  ]);

  return (
    <div className="mx-auto max-w-[720px] px-5 sm:px-6">
      <header className="pt-10 pb-6 text-center">
        <p className="label">{today()}</p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl font-bold tracking-tight">
          The Daily AI
        </h1>
        <p className="mt-2 font-serif italic text-subtle">
          Today&rsquo;s AI — what changed, why it matters, and what to do with it. One page.
        </p>
      </header>

      <Edition stories={stories} personalized={personalized} profile={profile} llm={getLlmInfo()} />

      <footer className="rule-double mt-10 pt-7 pb-12 text-center">
        <h2 className="font-serif text-2xl font-bold">Get this in your inbox</h2>
        <p className="mt-1 text-sm text-subtle">One page each morning. Signal over hype.</p>
        <div className="mt-4 flex justify-center">
          <SignupForm compact />
        </div>
        <p className="mt-8 label">© {new Date().getFullYear()} The Daily AI</p>
      </footer>
    </div>
  );
}
