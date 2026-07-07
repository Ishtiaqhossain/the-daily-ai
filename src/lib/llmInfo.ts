/** Minimal, server-side view of the active LLM provider for honest privacy copy. */
export interface LlmInfo {
  provider: string;
  local: boolean;
}

export function getLlmInfo(): LlmInfo {
  const provider = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
  const baseUrl = process.env.LLM_BASE_URL || "";
  const local = provider === "ollama" || /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(baseUrl);
  return { provider, local };
}
