import { NextResponse } from "next/server";
import { getQueue, saveQueue, getProfile } from "@/lib/store";
import { loadEdition } from "@/lib/edition";
import { draftTask } from "@/lib/queueDraft";
import { retrieveCode } from "@/lib/retrieval";
import type { QueuedTask } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ queue: await getQueue() });
}

/** Queue a brief: draft a grounded task and store it. */
export async function POST(req: Request) {
  let slug = "";
  try {
    slug = String((await req.json()).slug || "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const [{ stories, personalized }, profile, queue] = await Promise.all([
    loadEdition(),
    getProfile(),
    getQueue(),
  ]);
  const story = stories.find((s) => s.slug === slug);
  if (!story) return NextResponse.json({ error: "Unknown story." }, { status: 404 });

  const existing = queue.find((q) => q.slug === slug && q.status === "queued");
  if (existing) return NextResponse.json({ item: existing, already: true });

  const p = personalized.find((x) => x.slug === slug);
  // Agentic retrieval over the reader's local folders, then draft citing real files.
  const code = await retrieveCode(story, profile);
  const draft = await draftTask(story, p, profile, code?.block);

  const item: QueuedTask = {
    id: crypto.randomUUID(),
    slug,
    headline: story.headline,
    takeaway: story.takeaway,
    section: story.section,
    source: story.sources[0],
    matchedProject: p?.matchedProject ?? null,
    ...draft,
    citations: code?.files,
    status: "queued",
    createdAt: new Date().toISOString(),
  };
  await saveQueue([item, ...queue]);
  return NextResponse.json({ item });
}

/** Toggle status (queued ↔ done). */
export async function PATCH(req: Request) {
  let id = "";
  let status: QueuedTask["status"] = "done";
  try {
    const body = await req.json();
    id = String(body.id || "");
    status = body.status === "queued" ? "queued" : "done";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const queue = await getQueue();
  const next = queue.map((q) => (q.id === id ? { ...q, status } : q));
  await saveQueue(next);
  return NextResponse.json({ queue: next });
}

export async function DELETE(req: Request) {
  let id = "";
  try {
    id = String((await req.json()).id || "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const queue = (await getQueue()).filter((q) => q.id !== id);
  await saveQueue(queue);
  return NextResponse.json({ queue });
}
