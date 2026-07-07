import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-edition px-4 sm:px-6 py-24 text-center">
      <p className="kicker">Stop press</p>
      <h1 className="font-serif text-5xl font-bold mt-2">404 — Off the record</h1>
      <p className="mt-3 font-serif italic text-subtle text-lg">
        This story isn&rsquo;t in today&rsquo;s edition.
      </p>
      <Link
        href="/"
        className="inline-block mt-6 bg-ink text-paper px-4 py-2 text-sm font-medium rounded hover:bg-accent"
      >
        ← Back to the front page
      </Link>
    </div>
  );
}
