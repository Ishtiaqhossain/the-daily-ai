/**
 * send-digest — email the day's edition.
 *
 * Provider-agnostic over SMTP (Gmail, Resend, Postmark, Mailgun, self-hosted …).
 * With no SMTP configured it writes an HTML preview to data/last-digest.html so you
 * can see the email without any credentials — same graceful-degrade as the digest.
 *
 * Reads:  src/content/generated-edition.json, personalized-edition.json, data/profile.json,
 *         data/subscribers.json
 * Usage:  npm run email
 *
 * Env:
 *   EMAIL_HOST, EMAIL_PORT (587), EMAIL_USER, EMAIL_PASS, EMAIL_FROM   SMTP (optional)
 *   EMAIL_SECURE=true            force TLS (default: true when port 465)
 *   EMAIL_TO=you@x.com,...       send here instead of the subscriber list (great for testing)
 *   SITE_URL=http://localhost:3000
 *   DIGEST_TOP=5                 how many stories to include
 */
import { promises as fs } from "fs";
import path from "path";
import nodemailer from "nodemailer";
import { renderDigest, type DigestItem } from "../src/lib/emailDigest";

const SITE_URL = process.env.SITE_URL || "http://localhost:3000";
const TOP = Number(process.env.DIGEST_TOP || 5);
const CWD = process.cwd();
const PREVIEW = path.join(CWD, "data", "last-digest.html");

async function readJson<T>(rel: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(CWD, rel), "utf8"));
  } catch {
    return fallback;
  }
}

function prettyDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function recipients(): Promise<string[]> {
  if (process.env.EMAIL_TO) {
    return process.env.EMAIL_TO.split(",").map((s) => s.trim()).filter(Boolean);
  }
  const subs = await readJson<{ email: string }[]>("data/subscribers.json", []);
  return subs.map((s) => s.email).filter(Boolean);
}

async function main() {
  console.log("\n✉️  send-digest\n");

  const stories = await readJson<any[]>("src/content/generated-edition.json", []);
  if (stories.length === 0) {
    console.error("✗ No edition found. Run `npm run digest` first.");
    process.exit(1);
  }
  const personalized = await readJson<any[]>("src/content/personalized-edition.json", []);
  const profile = await readJson<any>("data/profile.json", null);
  const tuned = personalized.length > 0;
  const pMap: Record<string, any> = Object.fromEntries(personalized.map((p) => [p.slug, p]));

  // Order: by personalized relevance when tuned, else edition order.
  const ordered = tuned
    ? [...stories].sort((a, b) => (pMap[b.slug]?.score ?? 0) - (pMap[a.slug]?.score ?? 0))
    : stories;
  const items: DigestItem[] = ordered.slice(0, TOP).map((s) => ({ story: s, p: pMap[s.slug] }));

  const { subject, html, text } = renderDigest({
    prettyDate: prettyDate(),
    items,
    tuned,
    roleSignal: profile?.roleSignal,
    siteUrl: SITE_URL,
  });

  // Always write a preview so the run is inspectable.
  await fs.mkdir(path.dirname(PREVIEW), { recursive: true });
  await fs.writeFile(PREVIEW, html);
  console.log(`  Edition: ${items.length} stories (${tuned ? "tuned to you" : "general"})`);
  console.log(`  Subject: ${subject}`);
  console.log(`  Preview: ${path.relative(CWD, PREVIEW)}`);

  // EMAIL_TEST=1 fires a real send through nodemailer's Ethereal test SMTP and prints a
  // viewable preview URL — proves the send path end-to-end with no real credentials.
  if (!process.env.EMAIL_HOST && process.env.EMAIL_TEST) {
    const acct = await nodemailer.createTestAccount();
    const t = nodemailer.createTransport({
      host: acct.smtp.host,
      port: acct.smtp.port,
      secure: acct.smtp.secure,
      auth: { user: acct.user, pass: acct.pass },
    });
    const to = (await recipients())[0] || "you@example.com";
    const info = await t.sendMail({ from: "The Daily AI <test@ethereal.email>", to, subject, text, html });
    console.log(`\n✓ Test email sent to Ethereal (as ${to}).`);
    console.log(`  View it: ${nodemailer.getTestMessageUrl(info)}\n`);
    return;
  }

  if (!process.env.EMAIL_HOST) {
    console.log("\n⚠ No SMTP configured (EMAIL_HOST) — preview written, nothing sent.");
    console.log("  Set EMAIL_HOST/PORT/USER/PASS/FROM + EMAIL_TO in .env to send, or EMAIL_TEST=1 for a test send.\n");
    return;
  }

  const to = await recipients();
  if (to.length === 0) {
    console.log("\n⚠ No recipients (empty subscriber list and no EMAIL_TO). Preview written, nothing sent.\n");
    return;
  }

  const port = Number(process.env.EMAIL_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === "true" : port === 465,
    auth: process.env.EMAIL_USER ? { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } : undefined,
  });

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || "the-daily-ai@localhost";
  console.log(`\n  Sending via ${process.env.EMAIL_HOST}:${port} to ${to.length} recipient(s)…`);
  // One message per recipient so addresses aren't shared.
  let sent = 0;
  for (const rcpt of to) {
    try {
      await transport.sendMail({ from, to: rcpt, subject, text, html });
      sent++;
    } catch (e) {
      console.warn(`  ✗ ${rcpt}: ${(e as Error).message}`);
    }
  }
  console.log(`\n✓ Sent ${sent}/${to.length}.\n`);
}

main().catch((e) => {
  console.error("\n✗ send-digest failed:", e.message);
  process.exit(1);
});
