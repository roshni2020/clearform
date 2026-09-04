import { NextResponse } from "next/server";
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFSignature } from "pdf-lib";
import type { FormDocument, FormField, FieldKind } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SIGNATURE_RE = /sign|signature|initial/i;

function guessKind(label: string): FieldKind {
  const l = label.toLowerCase();
  if (SIGNATURE_RE.test(l)) return "signature";
  if (/\b(dob|date|birth|day|month|year|when)\b/.test(l)) return "date";
  if (/\b(phone|tel|mobile|cell|fax)\b/.test(l)) return "phone";
  if (/emergency|contact person|next of kin/.test(l)) return "contact";
  if (/allerg|medic|drug|condition|prescription/.test(l)) return "list";
  if (/policy|member|account|ssn|social security|id number|identifier|number|claim|group|npi|license|passport/.test(l)) return "identifier";
  if (/name|physician|doctor|provider|employer|guardian|spouse/.test(l)) return "name";
  return "text";
}

function isCritical(kind: FieldKind, label: string): boolean {
  return kind !== "text" || /amount|\$|dollar|income|salary|dose|dosage/i.test(label);
}

function humanizeFieldName(name: string): string {
  return name
    .replace(/\[\d+\]/g, "")
    .split(".")
    .pop()!
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function questionFor(label: string, kind: FieldKind): string {
  if (kind === "signature") return "This document requires your signature.";
  if (kind === "date") return `What is the ${label.toLowerCase()}?`;
  if (kind === "phone") return `What is the ${label.toLowerCase()}?`;
  if (kind === "list") return `Please tell me your ${label.toLowerCase()}. You can say none.`;
  if (kind === "identifier") return `What is the ${label.toLowerCase()}? Please say each character slowly.`;
  return `What is the ${label.toLowerCase()}?`;
}

function guessDocumentType(text: string, fields: FormField[]): string {
  const t = (text + " " + fields.map((f) => f.label).join(" ")).toLowerCase();
  if (/patient|clinic|physician|allerg|medication|insurance/.test(t) && /regist|intake|new patient/.test(t)) return "patient registration form";
  if (/patient|clinic|physician|allerg|medication/.test(t)) return "healthcare form";
  if (/claim|policy|insurer|coverage|premium|deductible/.test(t)) return "insurance document";
  if (/irs|tax|w-?2|1040|w-?9|withholding/.test(t)) return "tax form";
  if (/uscis|immigration|passport|visa|citizenship/.test(t)) return "government form";
  if (/tuition|student|enroll|school|university|financial aid|fafsa/.test(t)) return "education form";
  if (/account|routing|loan|mortgage|bank|credit/.test(t)) return "financial document";
  if (/lab|result|reference range|specimen/.test(t)) return "laboratory results report";
  return "structured document";
}

async function extractText(bytes: Uint8Array, maxPages = 3): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data: bytes, useSystemFonts: true, isEvalSupported: false }).promise;
    const out: string[] = [];
    const n = Math.min(doc.numPages, maxPages);
    for (let i = 1; i <= n; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      out.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
    }
    return out.join("\n").replace(/\s+/g, " ").trim();
  } catch (err) {
    console.warn("PDF text extraction unavailable:", (err as Error).message);
    return "";
  }
}

/**
 * Parse an uploaded PDF. Fillable (AcroForm) fields become voice questions and the
 * original PDF is returned so it can be filled and downloaded. The document is held
 * in memory only for this request; nothing is written to disk.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Please upload a PDF under 15 MB." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  let pdf: PDFDocument;
  try {
    pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch {
    return NextResponse.json({ error: "I couldn't open that file as a PDF." }, { status: 400 });
  }

  const fields: FormField[] = [];
  let signatureCount = 0;
  try {
    const acro = pdf.getForm();
    for (const f of acro.getFields()) {
      const name = f.getName();
      const label = humanizeFieldName(name);
      if (f instanceof PDFSignature || SIGNATURE_RE.test(name)) {
        signatureCount++;
        fields.push({ id: name, pdfFieldName: name, label: label || "Signature", question: "This document requires your signature.", kind: "signature", critical: true });
        continue;
      }
      if (f instanceof PDFTextField) {
        const kind = guessKind(label);
        fields.push({ id: name, pdfFieldName: name, label, question: questionFor(label, kind), kind, critical: isCritical(kind, label) });
      } else if (f instanceof PDFCheckBox) {
        fields.push({ id: name, pdfFieldName: name, label, question: `Should "${label}" be checked? Say yes or no.`, kind: "text", critical: false });
      } else if (f instanceof PDFDropdown || f instanceof PDFRadioGroup) {
        const options = (f as PDFDropdown | PDFRadioGroup).getOptions().slice(0, 8).join(", ");
        fields.push({ id: name, pdfFieldName: name, label, question: `For "${label}", the options are: ${options}. Which one applies?`, kind: "text", critical: false, help: `Options: ${options}` });
      }
    }
  } catch {
    /* no AcroForm */
  }

  const text = await extractText(bytes);
  const title = pdf.getTitle()?.trim() || (file instanceof File ? file.name.replace(/\.pdf$/i, "") : "Uploaded document");
  const detectedType = guessDocumentType(text, fields);
  const infoCount = fields.filter((f) => f.kind !== "signature").length;

  let intro: string;
  if (fields.length) {
    intro = `This appears to be a ${detectedType}. I found ${infoCount} fillable information field${infoCount === 1 ? "" : "s"} and ${signatureCount} signature field${signatureCount === 1 ? "" : "s"}. Would you like me to guide you through it?`;
  } else {
    intro = `This appears to be a ${detectedType}, but I couldn't find any fillable fields in this PDF, so I can't complete it safely. I can still read it to you and explain terms. Would you like that?`;
  }

  const doc: FormDocument = {
    id: `upload-${Date.now()}`,
    title,
    detectedType,
    intro,
    fields,
    sourcePdfBase64: Buffer.from(bytes).toString("base64"),
    extractedText: text.slice(0, 4000),
  };
  return NextResponse.json({ document: doc });
}
