import { NextResponse } from "next/server";
import { getProfile, saveProfile } from "@/lib/store";
import type { ActiveProject, InterestSignal, Profile } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ profile: await getProfile() });
}

/** Save user edits to the inferred topics. Edited/added topics are pinned so a
 *  rebuild from sources keeps them. */
export async function PUT(req: Request) {
  let body: Partial<Profile>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const existing = (await getProfile()) ?? {
    generatedAt: new Date().toISOString(),
    roleSignal: "",
    activeProjects: [],
    interests: [],
    sources: [],
  };

  const interests: InterestSignal[] = Array.isArray(body.interests)
    ? body.interests
        .filter((i) => i && String(i.label || "").trim())
        .map((i) => ({
          label: String(i.label).trim(),
          kind: i.kind || "topic",
          weight: Math.min(5, Math.max(1, Number(i.weight) || 3)),
          evidence: i.evidence || "edited in settings",
          // Respect the client's flag: only topics the user added/edited are pinned,
          // so a later rebuild can still refresh the untouched inferred ones.
          pinned: !!i.pinned,
        }))
    : existing.interests;

  const activeProjects: ActiveProject[] = Array.isArray(body.activeProjects)
    ? body.activeProjects.filter((p) => p && String(p.name || "").trim())
    : existing.activeProjects;

  // Sticky deletes: an inferred (un-pinned) topic that the user removed gets
  // added to the blocklist so a future rebuild won't bring it back.
  const incoming = new Set(interests.map((i) => i.label.toLowerCase()));
  let blocked = new Set((existing.blockedTopics ?? []).map((b) => b.toLowerCase()));
  if (Array.isArray(body.blockedTopics)) {
    // Authoritative (e.g. the "Reset hidden" action).
    blocked = new Set(body.blockedTopics.map((b) => String(b).toLowerCase()));
  } else {
    for (const i of existing.interests) {
      const l = i.label.toLowerCase();
      if (!incoming.has(l) && !i.pinned) blocked.add(l);
    }
  }
  // Anything currently present is, by definition, not hidden.
  for (const l of incoming) blocked.delete(l);

  const profile: Profile = {
    ...existing,
    roleSignal: body.roleSignal != null ? String(body.roleSignal) : existing.roleSignal,
    interests,
    activeProjects,
    blockedTopics: [...blocked],
  };
  await saveProfile(profile);
  return NextResponse.json({ profile });
}
