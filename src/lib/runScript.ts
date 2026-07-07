import { spawn } from "child_process";

/**
 * Run one of the local pipeline scripts (build-profile / personalize-edition)
 * from a server route. Local-first single-user app — this intentionally shells
 * out to the same CLI the user runs by hand, loading .env for the LLM key.
 */
export function runScript(
  script: string,
  timeoutMs = 120000
): Promise<{ ok: boolean; code: number; log: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["--env-file=.env", "--import", "tsx", `scripts/${script}`],
      { cwd: process.cwd(), env: process.env }
    );
    let log = "";
    const onData = (d: Buffer) => {
      log += d.toString();
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({ ok: false, code: -1, log: log + "\n[timed out]" });
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code: code ?? -1, log });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, code: -1, log: log + "\n" + err.message });
    });
  });
}
