import { NextResponse } from "next/server";
import { isTrustedUrl, linkupStructured } from "@/lib/linkup";
import type { FormMatch } from "@/lib/types";

export const dynamic = "force-dynamic";

interface MatchRequest {
  title?: string;
  /** Field labels or a text excerpt from the document. Never includes user answers. */
  excerpt?: string;
}

interface StructuredMatch {
  isKnownOfficialForm: boolean;
  confidence: number;
  formName: string | null;
  issuingOrganization: string | null;
  officialGuidanceUrl: string | null;
  summary: string | null;
}

const SCHEMA = {
  type: "object",
  properties: {
    isKnownOfficialForm: { type: "boolean", description: "True only if the text clearly corresponds to a specific, named official form." },
    confidence: { type: "number", description: "0 to 1. How confident the identification is." },
    formName: { type: ["string", "null"], description: "Official form name and number, e.g. 'Form CMS-1500'." },
    issuingOrganization: { type: ["string", "null"] },
    officialGuidanceUrl: { type: ["string", "null"], description: "URL of the official instructions from the issuing organization." },
    summary: { type: ["string", "null"], description: "One or two plain-language sentences about what the form is used for." },
  },
  required: ["isKnownOfficialForm", "confidence", "formName", "issuingOrganization", "officialGuidanceUrl", "summary"],
};

/**
 * Try to match a document to a known official form and its official guidance.
 * Explicitly reports uncertainty; never claims a confident match without evidence.
 */
export async function POST(req: Request) {
  let body: MatchRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const title = (body.title || "").toString().slice(0, 200);
  const excerpt = (body.excerpt || "").toString().slice(0, 1500);
  if (!title && !excerpt) return NextResponse.json({ error: "Nothing to match" }, { status: 400 });

  if (!process.env.LINKUP_API_KEY) {
    const match: FormMatch = {
      matched: false,
      confident: false,
      provider: "local",
      summary: "Official form matching needs Linkup. Add LINKUP_API_KEY to enable it.",
    };
    return NextResponse.json({ match });
  }

  const query = `A document has the title "${title}". Its field labels and visible text include: ${excerpt}. Identify whether this is a specific known official form (for example a US government, CMS, IRS, SSA, USCIS or insurance form). If it is, give the official form name/number, the issuing organization, the URL of the official instructions on the issuing organization's own website, and a one-sentence plain-language description of what the form is for. If it is a generic form (such as a clinic's own patient registration form) and not a specific published official form, set isKnownOfficialForm to false.`;

  try {
    const result = await linkupStructured<StructuredMatch>(query, SCHEMA);
    if (!result) {
      return NextResponse.json({ match: { matched: false, confident: false, provider: "linkup" } satisfies FormMatch });
    }
    const url = result.officialGuidanceUrl || undefined;
    const trusted = url ? isTrustedUrl(url) : false;
    const confident = result.isKnownOfficialForm && result.confidence >= 0.8 && Boolean(result.formName) && trusted;
    const match: FormMatch = {
      matched: result.isKnownOfficialForm && Boolean(result.formName),
      confident,
      formName: result.formName || undefined,
      summary: result.summary || undefined,
      sourceName: result.issuingOrganization || (url ? new URL(url).hostname : undefined),
      sourceUrl: url,
      provider: "linkup",
    };
    return NextResponse.json({ match });
  } catch (err) {
    console.error("Linkup match failed", err);
    return NextResponse.json({ match: { matched: false, confident: false, provider: "linkup" } satisfies FormMatch });
  }
}
