import type { FormField } from "./types";

/** Minimum speech-recognition confidence before a critical value may be read back. */
export const CRITICAL_CONFIDENCE = 0.6;
export const GENERAL_CONFIDENCE = 0.35;

export const AMBIGUOUS_MESSAGE = "I may not have heard that correctly. Please say it again.";

export interface TranscriptCheck {
  ok: boolean;
  reason?: string;
}

/**
 * Decide whether a transcript is trustworthy enough to read back for confirmation.
 * Never guesses: if it fails, the caller must ask the user to repeat.
 */
export function checkTranscript(field: FormField, transcript: string, confidence?: number): TranscriptCheck {
  const text = transcript.trim();
  if (!text) return { ok: false, reason: "I didn't catch anything. Please say it again." };
  if (text.length < 2) return { ok: false, reason: AMBIGUOUS_MESSAGE };

  const threshold = field.critical ? CRITICAL_CONFIDENCE : GENERAL_CONFIDENCE;
  if (typeof confidence === "number" && confidence < threshold) {
    return { ok: false, reason: AMBIGUOUS_MESSAGE };
  }

  if (field.kind === "phone") {
    const digits = text.replace(/\D/g, "");
    if (digits.length < 7) {
      return { ok: false, reason: "I heard fewer digits than a phone number usually has. Please say the full number." };
    }
  }
  if (field.kind === "date" && !/\d/.test(text) && !/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(text)) {
    return { ok: false, reason: "I didn't hear a date. Please say the month, day and year." };
  }
  return { ok: true };
}

/** Interpret a spoken yes/no. Returns null when unclear, so the caller asks again rather than guessing. */
export function parseYesNo(transcript: string): "yes" | "no" | null {
  const t = transcript.toLowerCase().trim();
  if (/^(yes|yeah|yep|yup|correct|that's correct|thats correct|that is correct|right|confirm|confirmed|ok|okay|sure)\b/.test(t)) return "yes";
  if (/\b(yes|correct|that's right|thats right)\b/.test(t) && !/\b(no|not|wrong|incorrect)\b/.test(t)) return "yes";
  if (/^(no|nope|nah|wrong|incorrect|try again|retry|not correct|that's wrong|thats wrong)\b/.test(t)) return "no";
  if (/\b(no|wrong|incorrect|again)\b/.test(t)) return "no";
  return null;
}

/** Normalise light formatting for display; never changes meaning. */
export function tidyValue(field: FormField, raw: string): string {
  let v = raw.trim().replace(/\s+/g, " ");
  if (!v) return v;
  if (field.kind === "phone") {
    const digits = v.replace(/\D/g, "");
    if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    return v;
  }
  if (field.kind === "identifier") {
    // Spoken identifiers often arrive as spaced characters: "A B 1 2" → "AB12"
    if (/^([a-z0-9] ?)+$/i.test(v) && v.replace(/\s/g, "").length <= 24) v = v.replace(/\s/g, "").toUpperCase();
    return v;
  }
  if (field.kind === "list" && /^(none|no|nothing|no allergies|no medications|not taking any|i don't have any)$/i.test(v)) return "None";
  // Sentence-case first letter for names and text.
  return v.charAt(0).toUpperCase() + v.slice(1);
}
