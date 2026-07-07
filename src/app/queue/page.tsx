import Link from "next/link";
import { QueueClient } from "@/components/QueueClient";

export const metadata = { title: "Reading queue · The Daily AI" };

export default function QueuePage() {
  return (
    <div className="mx-auto max-w-[720px] px-5 sm:px-6 overflow-x-hidden">
      <header className="pt-10 pb-2 text-center">
        <Link href="/" className="inline-block">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">The Daily AI</h1>
        </Link>
        <p className="mt-1 label">Reading queue</p>
        <p className="mt-2 font-serif italic text-subtle">
          Briefs you saved for later — each drafted into a concrete task tied to your work.
        </p>
      </header>

      <div className="mt-6 pb-16 rule-double pt-6">
        <QueueClient />
      </div>
    </div>
  );
}
