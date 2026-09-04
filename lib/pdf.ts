"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FieldAnswer, FormDocument } from "./types";

const NAVY = rgb(0.078, 0.196, 0.29);
const TEXT = rgb(0.09, 0.125, 0.165);
const MUTED = rgb(0.37, 0.42, 0.48);
const LINE = rgb(0.85, 0.88, 0.92);
const WARN = rgb(0.72, 0.47, 0.12);
const ERR = rgb(0.71, 0.14, 0.09);

/**
 * Produce the completed PDF.
 * - Uploaded PDFs with AcroForm fields: fill the original document. Signature fields are never touched.
 * - Otherwise: generate a clean completed document that mirrors the confirmed values.
 */
export async function buildCompletedPdf(doc: FormDocument, answers: Record<string, FieldAnswer>): Promise<Uint8Array> {
  if (doc.sourcePdfBase64 && doc.fields.some((f) => f.pdfFieldName)) {
    try {
      return await fillOriginalPdf(doc, answers);
    } catch (err) {
      console.warn("Filling original PDF failed; generating a completed copy instead.", err);
    }
  }
  return generateCompletedPdf(doc, answers);
}

async function fillOriginalPdf(doc: FormDocument, answers: Record<string, FieldAnswer>): Promise<Uint8Array> {
  const bytes = Uint8Array.from(atob(doc.sourcePdfBase64!), (c) => c.charCodeAt(0));
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = pdf.getForm();
  for (const field of doc.fields) {
    if (!field.pdfFieldName || field.kind === "signature") continue;
    const a = answers[field.id];
    if (!a || a.status !== "confirmed" || !a.value) continue;
    try {
      const f = form.getField(field.pdfFieldName);
      const ctor = f.constructor.name;
      if (ctor === "PDFTextField") form.getTextField(field.pdfFieldName).setText(a.value);
      else if (ctor === "PDFCheckBox") {
        const cb = form.getCheckBox(field.pdfFieldName);
        if (/^(yes|true|checked|check)$/i.test(a.value)) cb.check();
        else cb.uncheck();
      } else if (ctor === "PDFDropdown") {
        const dd = form.getDropdown(field.pdfFieldName);
        const opt = dd.getOptions().find((o) => o.toLowerCase() === a.value.toLowerCase());
        if (opt) dd.select(opt);
      } else if (ctor === "PDFRadioGroup") {
        const rg = form.getRadioGroup(field.pdfFieldName);
        const opt = rg.getOptions().find((o) => o.toLowerCase() === a.value.toLowerCase());
        if (opt) rg.select(opt);
      }
    } catch {
      /* skip fields that cannot be set */
    }
  }
  form.updateFieldAppearances();
  return pdf.save();
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

async function generateCompletedPdf(doc: FormDocument, answers: Record<string, FieldAnswer>): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${doc.title} — completed with ClearForm`);
  pdf.setProducer("ClearForm");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([612, 792]);
  const margin = 56;
  let y = 792 - margin;

  const newPageIfNeeded = (needed: number) => {
    if (y - needed < margin) {
      page = pdf.addPage([612, 792]);
      y = 792 - margin;
    }
  };

  page.drawText(doc.title, { x: margin, y, size: 22, font: bold, color: NAVY });
  y -= 20;
  page.drawText(`Completed with ClearForm voice guidance • ${new Date().toLocaleDateString()}`, { x: margin, y, size: 10, font, color: MUTED });
  y -= 14;
  page.drawLine({ start: { x: margin, y }, end: { x: 612 - margin, y }, thickness: 1, color: LINE });
  y -= 26;

  for (const field of doc.fields) {
    const a = answers[field.id];
    newPageIfNeeded(64);
    page.drawText(field.label.toUpperCase(), { x: margin, y, size: 9, font: bold, color: MUTED });
    y -= 16;

    if (field.kind === "signature") {
      page.drawLine({ start: { x: margin, y: y - 22 }, end: { x: margin + 260, y: y - 22 }, thickness: 1, color: TEXT });
      page.drawText("Signature required — not completed by ClearForm", { x: margin, y: y - 36, size: 9, font, color: ERR });
      y -= 56;
      continue;
    }

    if (a && a.status === "confirmed" && a.value) {
      const lines = wrap(a.value, 78);
      for (const line of lines) {
        newPageIfNeeded(18);
        page.drawText(line, { x: margin, y, size: 13, font, color: TEXT });
        y -= 18;
      }
      page.drawText("Confirmed by voice", { x: margin, y, size: 8.5, font, color: rgb(0.18, 0.49, 0.36) });
      y -= 22;
    } else if (a && (a.status === "needs-review" || a.status === "unreadable")) {
      page.drawText("Needs review — not filled", { x: margin, y, size: 12, font: bold, color: WARN });
      y -= 22;
    } else {
      page.drawText("Not provided", { x: margin, y, size: 12, font, color: MUTED });
      y -= 22;
    }
    page.drawLine({ start: { x: margin, y: y + 6 }, end: { x: 612 - margin, y: y + 6 }, thickness: 0.5, color: LINE });
    y -= 10;
  }

  newPageIfNeeded(40);
  y -= 10;
  page.drawText("Every value above was spoken by the user, read back, and confirmed before being written. ClearForm did not guess any value and did not sign this document.", {
    x: margin,
    y,
    size: 8.5,
    font,
    color: MUTED,
    maxWidth: 612 - margin * 2,
    lineHeight: 11,
  });

  return pdf.save();
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
