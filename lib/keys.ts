/** Read API keys defensively: tolerate pasted whitespace/newlines/extra text. Never log the value. */
export function elevenLabsKey(): string | undefined {
  const raw = process.env.ELEVENLABS_API_KEY || "";
  return raw.match(/sk_[A-Za-z0-9]+/)?.[0] || raw.trim().split(/\s+/)[0] || undefined;
}

export function linkupKey(): string | undefined {
  const raw = process.env.LINKUP_API_KEY || "";
  return raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] || raw.trim().split(/\s+/)[0] || undefined;
}

/** Strip anything that looks like a secret from text destined for a response or log. */
export function redact(text: string): string {
  return text.replace(/sk_[A-Za-z0-9]+/g, "sk_[redacted]").replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "[redacted]");
}
