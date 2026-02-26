import Anthropic from "@anthropic-ai/sdk";

// Lazy-init — constructor fails if API key is missing (breaks Docker build)
let _client: Anthropic | null = null;

/** Lazy-init Anthropic client singleton. Returns null if ANTHROPIC_API_KEY not set. */
export function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!_client) _client = new Anthropic();
  return _client;
}
