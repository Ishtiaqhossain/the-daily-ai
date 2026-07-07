import { NextResponse } from "next/server";
import { runScript } from "@/lib/runScript";

/** Re-rank + rewrite today's edition against the current profile.
 *  Note: the homepage reads the personalized edition from a build-time import,
 *  so a `next build` (or dev hot-reload) is needed to surface the new ranking. */
export async function POST() {
  const result = await runScript("personalize-edition.ts");
  if (!result.ok) {
    return NextResponse.json(
      { error: "Personalize failed.", log: result.log.slice(-1500) },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, log: result.log.slice(-1500) });
}
