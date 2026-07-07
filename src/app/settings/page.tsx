import Link from "next/link";
import { SettingsClient } from "@/components/SettingsClient";
import { getLlmInfo } from "@/lib/llmInfo";

export const metadata = { title: "Personalization · The Daily AI" };

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-[720px] px-5 sm:px-6 overflow-x-hidden">
      <header className="pt-10 pb-2 text-center">
        <Link href="/" className="inline-block">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">The Daily AI</h1>
        </Link>
        <p className="mt-1 label">Personalization</p>
        <p className="mt-2 font-serif italic text-subtle">
          Tell it what you work on. See and edit the topics it uses to pick your news.
        </p>
      </header>

      <div className="mt-6 pb-16">
        <SettingsClient llm={getLlmInfo()} />
      </div>
    </div>
  );
}
