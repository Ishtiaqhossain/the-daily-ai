import type { Personalized, Story } from "./types";

export interface DigestItem {
  story: Story;
  p?: Personalized;
}

export interface DigestInput {
  prettyDate: string;
  items: DigestItem[]; // already ordered, top-N
  tuned: boolean;
  roleSignal?: string;
  siteUrl: string;
}

// Email-safe palette (matches the site).
const PAPER = "#FAF8F3";
const INK = "#11110F";
const SUBTLE = "#5C5A52";
const HAIR = "#E2DED3";
const ACCENT = "#1B3BFF";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'SFMono-Regular', Menlo, Consolas, monospace";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function kickerLabel(item: DigestItem, tuned: boolean): string {
  if (tuned && item.p?.matchedProject) return item.p.matchedProject;
  if (item.story.marketMove) return "Market move";
  return item.story.section;
}

function itemHtml(item: DigestItem, tuned: boolean, siteUrl: string, i: number): string {
  const { story, p } = item;
  const why = tuned && p ? p.whyForYou : story.whyItMatters;
  const whyLabel = tuned && p ? "Why this matters to you" : "Why it matters";
  const link = `${siteUrl}/#${story.slug}`;
  const doNext = tuned && p && p.doNext && p.doNext.toLowerCase() !== "skip" ? p.doNext : "";
  return `
  <tr><td style="padding:22px 0 0 0;border-top:1px solid ${HAIR};">
    <div style="font-family:${MONO};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${ACCENT};">
      ${i + 1} &nbsp;·&nbsp; ${esc(kickerLabel(item, tuned))} &nbsp;·&nbsp; <span style="color:${SUBTLE};">${story.readMinutes} min</span>
    </div>
    <a href="${link}" style="text-decoration:none;color:${INK};">
      <div style="font-family:${SERIF};font-size:22px;line-height:1.2;font-weight:700;margin:6px 0 0 0;">${esc(story.headline)}</div>
    </a>
    <div style="font-family:${SERIF};font-style:italic;font-size:16px;line-height:1.35;color:${SUBTLE};margin:6px 0 0 0;">${esc(story.takeaway)}</div>
    <div style="font-family:${SANS};font-size:14px;line-height:1.5;color:${INK};margin:12px 0 0 0;">
      <span style="font-family:${MONO};font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${ACCENT};">${whyLabel}</span>
      &nbsp;${esc(why)}
    </div>
    ${doNext ? `<div style="font-family:${SANS};font-size:14px;line-height:1.5;color:${INK};margin:8px 0 0 0;">
      <span style="font-family:${MONO};font-size:10px;letter-spacing:1px;text-transform:uppercase;color:${ACCENT};">Do next</span>
      &nbsp;${esc(doNext)}</div>` : ""}
    <div style="margin:12px 0 4px 0;"><a href="${link}" style="font-family:${MONO};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${ACCENT};text-decoration:none;">Read the brief &rarr;</a></div>
  </td></tr>`;
}

export function renderDigest(input: DigestInput): { subject: string; html: string; text: string } {
  const { prettyDate, items, tuned, roleSignal, siteUrl } = input;
  const top = items[0]?.story.headline ?? "Today in AI";
  const subject = `The Daily AI · ${prettyDate}: ${top}`;
  const preheader = tuned ? `Top ${items.length} for your work today.` : `The ${items.length} things that matter today.`;

  const rows = items.map((it, i) => itemHtml(it, tuned, siteUrl, i)).join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
  <tr><td align="center" style="padding:28px 16px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
      <!-- masthead -->
      <tr><td align="center" style="padding-bottom:8px;">
        <div style="font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${SUBTLE};">${esc(prettyDate)}</div>
        <div style="font-family:${SERIF};font-size:38px;font-weight:700;letter-spacing:-0.5px;color:${INK};margin-top:4px;">The Daily AI</div>
        <div style="font-family:${SERIF};font-style:italic;font-size:15px;color:${SUBTLE};margin-top:6px;">What changed, why it matters, and what to do with it.</div>
      </td></tr>
      <tr><td style="border-top:3px double ${INK};padding-top:14px;">
        <div style="font-family:${MONO};font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${ACCENT};">${esc(preheader)}</div>
        ${tuned && roleSignal ? `<div style="font-family:${SANS};font-size:12px;color:${SUBTLE};margin-top:4px;">Tuned to: ${esc(roleSignal)}</div>` : ""}
      </td></tr>
      <!-- items -->
      ${rows}
      <!-- footer -->
      <tr><td style="border-top:3px double ${INK};padding-top:16px;margin-top:8px;">
        <div style="font-family:${SANS};font-size:12px;color:${SUBTLE};line-height:1.5;">
          You&rsquo;re getting this because you subscribed to The Daily AI.
          <a href="${siteUrl}" style="color:${ACCENT};text-decoration:none;">Open the edition</a> ·
          <a href="${siteUrl}/queue" style="color:${ACCENT};text-decoration:none;">Reading queue</a><br>
          Reply <b>unsubscribe</b> to stop.
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  const text = [
    `THE DAILY AI · ${prettyDate}`,
    preheader,
    "",
    ...items.map((it, i) => {
      const why = tuned && it.p ? it.p.whyForYou : it.story.whyItMatters;
      return `${i + 1}. ${it.story.headline}\n   ${it.story.takeaway}\n   Why: ${why}\n   ${siteUrl}/#${it.story.slug}`;
    }),
    "",
    `Open: ${siteUrl}  ·  Reply "unsubscribe" to stop.`,
  ].join("\n");

  return { subject, html, text };
}
