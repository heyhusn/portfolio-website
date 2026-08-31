/**
 * LLM client — OpenAI-compatible chat completions.
 *
 * Deliberately provider-agnostic: DeepSeek, OpenAI, Groq, OpenRouter, Together
 * and a local Ollama all speak this shape, so switching provider is two lines
 * in backend/.env rather than a rewrite. Defaults target DeepSeek.
 *
 * The key is read from the environment and never leaves this process. The
 * browser talks to /api/rag/ask; it never sees a provider or a key. That is
 * the whole reason this route exists on the server instead of in the React
 * app, where the key would be readable by every visitor.
 */

/**
 * Configuration is read at call time, not captured at import time.
 *
 * A module-scope `const API_KEY = process.env.LLM_API_KEY` is a snapshot taken
 * the instant this file is first imported — and in ESM that is before any
 * statement in the module that imported it. One env-loading change upstream
 * was enough to make the whole assistant report "no API key" from a .env that
 * plainly had one. Reading lazily costs nothing and cannot go stale.
 *
 * On Vercel there is no .env at all: the same variables arrive already set in
 * the function's environment, and this reads them the same way.
 */
const baseUrl = () => (process.env.LLM_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
const model = () => process.env.LLM_MODEL || "deepseek-chat";
const apiKey = () => process.env.LLM_API_KEY || "";
const timeoutMs = () => Number(process.env.LLM_TIMEOUT_MS) || 45000;

export const llmConfigured = () => Boolean(apiKey());
export const llmInfo = () => ({ baseUrl: baseUrl(), model: model(), configured: llmConfigured() });

export class LlmError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function post(path, body, signal) {
  let res;
  try {
    res = await fetch(`${baseUrl()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey()}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err; // the caller's timeout, handled there
    // DNS failure, refused connection, TLS problem — almost always a wrong
    // LLM_BASE_URL or no outbound network. Surfacing this as a bare 500
    // ("something went wrong") sent whoever is debugging it looking in the
    // wrong place, so name it.
    console.error(`[llm] cannot reach ${baseUrl()}: ${err.message}`);
    throw new LlmError(
      "The language model can't be reached — check LLM_BASE_URL and network access.",
      502
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // The provider's error body can echo request content; log it server-side,
    // but never hand it to the browser.
    console.error(`[llm] ${res.status} from ${baseUrl()}${path}: ${detail.slice(0, 500)}`);
    throw new LlmError(
      res.status === 401
        ? "The language model rejected the API key."
        : res.status === 429
        ? "The language model is rate-limited right now."
        : "The language model is unavailable right now.",
      res.status
    );
  }
  return res;
}

export async function chat(messages, { temperature = 0.2, maxTokens = 700 } = {}) {
  if (!llmConfigured()) throw new LlmError("LLM_API_KEY is not set in backend/.env", 503);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const res = await post(
      "/v1/chat/completions",
      { model: model(), messages, temperature, max_tokens: maxTokens, stream: false },
      controller.signal
    );
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content;
    if (typeof text !== "string") throw new LlmError("The language model returned no content.", 502);
    return { text: text.trim(), usage: json.usage || null };
  } catch (err) {
    if (err.name === "AbortError") throw new LlmError("The language model timed out.", 504);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Server-sent-events stream. Yields text deltas. */
export async function* chatStream(messages, { temperature = 0.2, maxTokens = 700 } = {}) {
  if (!llmConfigured()) throw new LlmError("LLM_API_KEY is not set in backend/.env", 503);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const res = await post(
      "/v1/chat/completions",
      { model: model(), messages, temperature, max_tokens: maxTokens, stream: true },
      controller.signal
    );

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE frames are separated by a blank line; a chunk boundary can land
      // mid-frame, so only complete frames are consumed and the tail is kept.
      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";

      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const delta = JSON.parse(payload)?.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            /* keep-alive or partial frame — ignore */
          }
        }
      }
    }
  } catch (err) {
    if (err.name === "AbortError") throw new LlmError("The language model timed out.", 504);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
