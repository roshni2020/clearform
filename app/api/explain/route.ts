import { NextResponse } from "next/server";
import { lookupGlossary, normalizeTerm } from "@/lib/glossary";
import { TRUSTED_DOMAINS, isTrustedUrl, linkupSourcedAnswer, looksLikePersonalValueQuestion, VALUE_GUARD_MESSAGE } from "@/lib/linkup";
import type { Explanation } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ExplainRequest {
  question: string;
  /** Optional context, e.g. "patient registration form" or "lab results". */
  context?: string;
}

/**
 * Explain a term or field in plain language.
 * 1. Guard: refuse anything patient-specific.
 * 2. Linkup with trusted domains → plain-language answer + source.
 * 3. Linkup without domain filter (marked untrusted) → only if nothing trusted found.
 * 4. Built-in glossary fallback.
 */
export async function POST(req: Request) {
  let body: ExplainRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const question = (body.question || "").toString().trim().slice(0, 300);
  if (!question) return NextResponse.json({ error: "Empty question" }, { status: 400 });

  if (looksLikePersonalValueQuestion(question)) {
    return NextResponse.json({ refused: true, message: VALUE_GUARD_MESSAGE });
  }

  const term = normalizeTerm(question);
  const glossaryHit = lookupGlossary(question);
  const context = body.context ? ` in the context of a ${body.context}` : "";

  if (process.env.LINKUP_API_KEY) {
    const prompt = `Explain the term or field "${term}"${context} in plain, simple language suitable for someone hearing it read aloud. Two or three short sentences. Define only what the term means in general; do not give medical, legal or financial advice, do not diagnose, and do not suggest values.`;
    try {
      let result = await linkupSourcedAnswer(prompt, TRUSTED_DOMAINS);
      let trusted = true;
      if (!result || !result.sources.length) {
        result = await linkupSourcedAnswer(prompt);
        trusted = false;
      }
      if (result && result.answer) {
        const trustedSource = result.sources.find((s) => isTrustedUrl(s.url));
        const source = trustedSource || result.sources[0];
        const explanation: Explanation = {
          term,
          explanation: result.answer.trim(),
          sourceName: source?.name || "Linkup search",
          sourceUrl: source?.url || "https://www.linkup.so/",
          provider: "linkup",
          trusted: trusted && Boolean(trustedSource),
        };
        return NextResponse.json({ explanation });
      }
    } catch (err) {
      console.error("Linkup explain failed", err);
    }
  }

  if (glossaryHit) return NextResponse.json({ explanation: glossaryHit });

  return NextResponse.json({
    notFound: true,
    message: `I don't have a trusted explanation for "${term}" right now, and I won't guess. Please ask the person who gave you this document.`,
  });
}
