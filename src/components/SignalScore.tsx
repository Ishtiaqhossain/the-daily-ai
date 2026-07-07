import type { Level, SignalScore as Score } from "@/lib/types";

function color(level: Level, invert = false): string {
  const good = "text-signalHigh";
  const mid = "text-signalMed";
  const bad = "text-signalLow";
  if (invert) {
    // For hype risk, High is bad.
    return level === "High" ? bad : level === "Medium" ? mid : good;
  }
  return level === "High" ? good : level === "Medium" ? mid : bad;
}

function dots(level: Level): string {
  return level === "High" ? "●●●" : level === "Medium" ? "●●○" : "●○○";
}

function Row({ label, level, invert }: { label: string; level: Level; invert?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="label">{label}</span>
      <span className={`text-xs font-medium tabular-nums ${color(level, invert)}`}>
        <span className="font-mono tracking-tight mr-1.5">{dots(level)}</span>
        {level}
      </span>
    </div>
  );
}

export function SignalScore({ score, title = "Signal score" }: { score: Score; title?: string }) {
  return (
    <div className="rule-t rule-b py-2">
      <p className="kicker mb-1">{title}</p>
      <Row label="Signal" level={score.signal} />
      <Row label="Novelty" level={score.novelty} />
      <Row label="Practical value" level={score.practical} />
      <Row label="Hype risk" level={score.hypeRisk} invert />
    </div>
  );
}

export function SignalPill({ level }: { level: Level }) {
  return (
    <span className={`text-[0.72rem] font-mono uppercase tracking-wide ${color(level)}`}>
      {dots(level)} {level} signal
    </span>
  );
}
