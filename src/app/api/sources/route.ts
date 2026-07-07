import { NextResponse } from "next/server";
import { getSources, saveSources } from "@/lib/store";
import type { SourceConfig, SourceType } from "@/lib/types";

const TYPES: SourceType[] = ["claude-sessions", "folder", "github", "text"];

export async function GET() {
  return NextResponse.json({ sources: await getSources() });
}

export async function PUT(req: Request) {
  let body: { sources?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  if (!Array.isArray(body.sources)) {
    return NextResponse.json({ error: "Expected { sources: [...] }." }, { status: 400 });
  }
  const clean: SourceConfig[] = [];
  for (const s of body.sources as SourceConfig[]) {
    if (!TYPES.includes(s.type)) continue;
    if ((s.type === "folder" || s.type === "github" || s.type === "text") && !String(s.value || "").trim()) continue;
    clean.push({
      id: String(s.id || Math.random().toString(36).slice(2)),
      type: s.type,
      value: String(s.value || ""),
      label: s.label ? String(s.label) : undefined,
      enabled: s.enabled !== false,
    });
  }
  await saveSources(clean);
  return NextResponse.json({ sources: clean });
}
