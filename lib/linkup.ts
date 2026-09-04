/**
 * Linkup server-side helper — the trusted explanation and official-guidance layer.
 *
 * Linkup is only ever asked to explain terminology or identify official forms.
 * It is never asked to guess dosages, lab values, dates, identifiers or answers
 * to form questions — see `looksLikePersonalValueQuestion`.
 */

export const TRUSTED_DOMAINS = [
  "nih.gov",
  "medlineplus.gov",
  "cdc.gov",
  "cms.gov",
  "fda.gov",
  "healthcare.gov",
  "medicare.gov",
  "hhs.gov",
  "ssa.gov",
  "irs.gov",
  "uscis.gov",
  "usa.gov",
  "studentaid.gov",
  "ed.gov",
  "consumerfinance.gov",
];

export interface LinkupSource {
  name: string;
  url: string;
  snippet?: string;
}
export interface LinkupAnswer {
  answer: string;
  sources: LinkupSource[];
}

export function isTrustedUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".gov") || TRUSTED_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

/** Questions Linkup must never answer: anything patient-specific or value-guessing. */
export function looksLikePersonalValueQuestion(q: string): boolean {
  const t = q.toLowerCase();
  return (
    /\b(my|patient'?s|this patient'?s)\s+(dose|dosage|result|value|number|date|diagnosis|policy|account|id|name|address|phone|birth)/.test(t) ||
    /\b(what (dose|dosage) should|how much (should|do) i take|how many (mg|milligrams|pills)|should i take|is (this|my) (result|value|level) (normal|healthy|bad|good|dangerous)|do i have|am i (sick|diabetic|healthy)|what is wrong with me|what treatment)\b/.test(t) ||
    /\b(fill in|what should i (put|write|answer|say) for)\b/.test(t)
  );
}

export const VALUE_GUARD_MESSAGE =
  "I can explain what a term or field means, but I can't determine patient-specific values, dosages, results or answers. Please check with the document or a qualified professional.";

async function linkupFetch(body: Record<string, unknown>): Promise<Response> {
  const key = process.env.LINKUP_API_KEY;
  if (!key) throw new Error("LINKUP_API_KEY not configured");
  return fetch("https://api.linkup.so/v1/search", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function linkupSourcedAnswer(query: string, includeDomains?: string[]): Promise<LinkupAnswer | null> {
  const res = await linkupFetch({
    q: query,
    depth: "standard",
    outputType: "sourcedAnswer",
    ...(includeDomains?.length ? { includeDomains } : {}),
  });
  if (!res.ok) {
    console.error("Linkup error", res.status, (await res.text().catch(() => "")).slice(0, 300));
    return null;
  }
  const json = (await res.json()) as { answer?: string; sources?: LinkupSource[] };
  if (!json.answer) return null;
  return { answer: json.answer, sources: json.sources || [] };
}

export async function linkupStructured<T>(query: string, schema: Record<string, unknown>, includeDomains?: string[]): Promise<T | null> {
  const res = await linkupFetch({
    q: query,
    depth: "standard",
    outputType: "structured",
    structuredOutputSchema: schema,
    ...(includeDomains?.length ? { includeDomains } : {}),
  });
  if (!res.ok) {
    console.error("Linkup structured error", res.status, (await res.text().catch(() => "")).slice(0, 300));
    return null;
  }
  return (await res.json()) as T;
}
