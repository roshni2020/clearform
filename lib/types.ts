export type FieldKind =
  | "text"
  | "name"
  | "date"
  | "phone"
  | "contact"
  | "list"
  | "identifier"
  | "signature";

export type FieldStatus =
  | "pending"
  | "active"
  | "confirmed"
  | "needs-review"
  | "unreadable"
  | "signature";

export interface FormField {
  id: string;
  label: string;
  question: string;
  kind: FieldKind;
  /** Values that must never be guessed; low STT confidence forces a retry. */
  critical: boolean;
  /** Short plain-language explanation offered when the user asks what a field means. */
  help?: string;
  placeholder?: string;
  /** Original AcroForm field name when the document was uploaded. */
  pdfFieldName?: string;
}

export interface FormDocument {
  id: string;
  title: string;
  detectedType: string;
  intro: string;
  fields: FormField[];
  /** Original PDF bytes as base64 (uploaded documents only). Held in memory for the session only. */
  sourcePdfBase64?: string;
  /** Text extracted from an uploaded PDF, used for form matching. Never persisted. */
  extractedText?: string;
}

export interface FieldAnswer {
  value: string;
  status: FieldStatus;
  confidence?: number;
}

export type AssistantState =
  | "ready"
  | "speaking"
  | "listening"
  | "transcribing"
  | "awaiting-confirmation"
  | "confirmed"
  | "needs-review"
  | "complete";

export interface Explanation {
  term: string;
  explanation: string;
  sourceName: string;
  sourceUrl: string;
  provider: "linkup" | "glossary";
  trusted: boolean;
}

export interface FormMatch {
  matched: boolean;
  confident: boolean;
  formName?: string;
  summary?: string;
  sourceName?: string;
  sourceUrl?: string;
  provider: "linkup" | "local";
}
