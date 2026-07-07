import { NextResponse } from "next/server";
import { getProfile } from "@/lib/store";
import { runScript } from "@/lib/runScript";

/** Re-run the profiler over the configured sources, then return the new profile. */
export async function POST() {
  const result = await runScript("build-profile.ts");
  if (!result.ok) {
    return NextResponse.json(
      { error: "Profiler failed.", log: result.log.slice(-1500) },
      { status: 500 }
    );
  }
  return NextResponse.json({ profile: await getProfile(), log: result.log.slice(-1500) });
}
