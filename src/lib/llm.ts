/**
 * llm — provider-agnostic completion layer for the digest/profile/personalize scripts.
 *
 * Pick a provider with env vars; every script calls the same `complete()`:
 *
 *   LLM_PROVIDER   anthropic | openai | google | groq | together | openrouter |
 *                  mistral | deepseek | ollama | openai-compatible   (default: anthropic)
 *   LLM_MODEL      model id (falls back to a sensible per-provider default)
 *   LLM_API_KEY    generic key (else the provider's own *_API_KEY is used)
 *   LLM_BASE_URL   override base URL (for self-hosted / any OpenAI-compatible endpoint)
 *
 * Anthropic, OpenAI-compatible, and Google use plain fetch — no provider SDKs, so the
 * app has zero hard dependency on any single vendor.
 *
 * Examples:
 *   LLM_PROVIDER=openai  OPENAI_API_KEY=sk-...        LLM_MODEL=gpt-4o-mini
 *   LLM_PROVIDER=google  GEMINI_API_KEY=...           LLM_MODEL=gemini-2.0-flash
 *   LLM_PROVIDER=groq    GROQ_API_KEY=...             LLM_MODEL=llama-3.3-70b-versatile
 *   LLM_PROVIDER=ollama                                LLM_MODEL=llama3.1   (no key needed)
 */

type Family = "anthropic" | "openai" | "google";

interface Preset {
  family: Family;
  baseUrl: string;
  keyEnv: string[];
  model: string;
  keyless?: boolean;
}

// Known providers. OpenAI-compatible vendors share the `openai` family + a base URL.
const PRESETS: Record<string, Preset> = {
  anthropic: {
    family: "anthropic",
    baseUrl: "https://api.anthropic.com",
    keyEnv: ["ANTHROPIC_API_KEY"],
    model: "claude-sonnet-4-6",
  },
  openai: {
    family: "openai",
    baseUrl: "https://api.openai.com/v1",
    keyEnv: ["OPENAI_API_KEY"],
    model: "gpt-4o-mini",
  },
  google: {
    family: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    keyEnv: ["GOOGLE_API_KEY", "GEMINI_API_KEY"],
    model: "gemini-2.0-flash",
  },
  gemini: {
    family: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    keyEnv: ["GEMINI_API_KEY", "GOOGLE_API_KEY"],
    model: "gemini-2.0-flash",
  },
  groq: {
    family: "openai",
    baseUrl: "https://api.groq.com/openai/v1",
    keyEnv: ["GROQ_API_KEY"],
    model: "llama-3.3-70b-versatile",
  },
  together: {
    family: "openai",
    baseUrl: "https://api.together.xyz/v1",
    keyEnv: ["TOGETHER_API_KEY"],
    model: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  },
  openrouter: {
    family: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    keyEnv: ["OPENROUTER_API_KEY"],
    model: "anthropic/claude-3.5-sonnet",
  },
  mistral: {
    family: "openai",
    baseUrl: "https://api.mistral.ai/v1",
    keyEnv: ["MISTRAL_API_KEY"],
    model: "mistral-large-latest",
  },
  deepseek: {
    family: "openai",
    baseUrl: "https://api.deepseek.com/v1",
    keyEnv: ["DEEPSEEK_API_KEY"],
    model: "deepseek-chat",
  },
  ollama: {
    family: "openai",
    baseUrl: "http://localhost:11434/v1",
    keyEnv: [],
    model: "llama3.1",
    keyless: true,
  },
  "openai-compatible": {
    family: "openai",
    baseUrl: "",
    keyEnv: ["LLM_API_KEY"],
    model: "",
  },
};

export interface Config {
  provider: string;
  family: Family;
  baseUrl: string;
  apiKey: string;
  model: string;
  keyless: boolean;
}

export function resolveConfig(modelOverride?: string): Config {
  const provider = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
  const preset = PRESETS[provider];
  if (!preset) {
    throw new Error(
      `Unknown LLM_PROVIDER "${provider}". Options: ${Object.keys(PRESETS).join(", ")}`
    );
  }
  const apiKey =
    process.env.LLM_API_KEY ||
    preset.keyEnv.map((k) => process.env[k]).find(Boolean) ||
    "";
  const baseUrl = process.env.LLM_BASE_URL || preset.baseUrl;
  const model = modelOverride || process.env.LLM_MODEL || preset.model;
  return { provider, family: preset.family, baseUrl, apiKey, model, keyless: !!preset.keyless };
}

/** True if a provider is usable (has a key, or is a keyless local endpoint). */
export function isConfigured(): boolean {
  try {
    const c = resolveConfig();
    return c.keyless || !!c.apiKey;
  } catch {
    return false;
  }
}

export function describe(modelOverride?: string): string {
  const c = resolveConfig(modelOverride);
  return `${c.provider}/${c.model}`;
}

export interface CompleteOptions {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export async function complete(opts: CompleteOptions): Promise<string> {
  const cfg = resolveConfig(opts.model);
  if (!cfg.baseUrl) {
    throw new Error("No LLM_BASE_URL set for openai-compatible provider.");
  }
  if (!cfg.keyless && !cfg.apiKey) {
    throw new Error(`No API key for provider "${cfg.provider}". Set LLM_API_KEY or the provider's key.`);
  }
  if (!cfg.model) {
    throw new Error("No model set. Provide LLM_MODEL.");
  }
  if (cfg.family === "anthropic") return anthropic(cfg, opts);
  if (cfg.family === "google") return google(cfg, opts);
  return openai(cfg, opts);
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} — ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function anthropic(cfg: Config, opts: CompleteOptions): Promise<string> {
  const data = await post(
    `${cfg.baseUrl}/v1/messages`,
    { "x-api-key": cfg.apiKey, "anthropic-version": "2023-06-01" },
    {
      model: cfg.model,
      max_tokens: opts.maxTokens ?? 2048,
      ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
      ...(opts.system ? { system: opts.system } : {}),
      messages: [{ role: "user", content: opts.prompt }],
    }
  );
  return (data.content || [])
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text)
    .join("");
}

async function openai(cfg: Config, opts: CompleteOptions): Promise<string> {
  const messages = [
    ...(opts.system ? [{ role: "system", content: opts.system }] : []),
    { role: "user", content: opts.prompt },
  ];
  const data = await post(
    `${cfg.baseUrl}/chat/completions`,
    cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {},
    {
      model: cfg.model,
      messages,
      max_tokens: opts.maxTokens ?? 2048,
      ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
    }
  );
  return data.choices?.[0]?.message?.content ?? "";
}

async function google(cfg: Config, opts: CompleteOptions): Promise<string> {
  const url = `${cfg.baseUrl}/models/${cfg.model}:generateContent?key=${cfg.apiKey}`;
  const data = await post(
    url,
    {},
    {
      ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
      contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 2048,
        ...(opts.temperature != null ? { temperature: opts.temperature } : {}),
      },
    }
  );
  return (data.candidates?.[0]?.content?.parts || [])
    .map((p: any) => p.text || "")
    .join("");
}

/** Tolerant JSON extraction — strips markdown fences and leading prose. */
export function parseJson<T = unknown>(text: string): T {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  // Fall back to the first {...} or [...] span if the model added prose.
  if (s && s[0] !== "{" && s[0] !== "[") {
    const start = s.search(/[{[]/);
    if (start >= 0) s = s.slice(start);
  }
  return JSON.parse(s) as T;
}
