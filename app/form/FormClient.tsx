"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useSearchParams } from "next/navigation";
import { SAMPLE_FORM } from "@/lib/sampleForm";
import { useFormFlow } from "@/lib/useFormFlow";
import { buildCompletedPdf, downloadPdf } from "@/lib/pdf";
import { useAnnounce } from "@/components/Announcer";
import { DocumentPreview } from "@/components/DocumentPreview";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { AskClearForm } from "@/components/AskClearForm";
import { FormMatchCard } from "@/components/FormMatchCard";
import { PRIVACY_STATEMENT } from "@/components/Footer";
import { DocIcon, ShieldIcon, UploadIcon, WarningIcon } from "@/components/Icons";

export function FormClient() {
  const params = useSearchParams();
  const flow = useFormFlow();
  const announce = useAnnounce();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const autoStarted = useRef(false);

  const loadSample = useCallback(() => {
    setUploadError(null);
    flow.loadDocument(SAMPLE_FORM);
  }, [flow]);

  // ?sample=1 opens the sample immediately (from the home page CTA).
  useEffect(() => {
    if (params.get("sample") && !autoStarted.current) {
      autoStarted.current = true;
      loadSample();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // #upload (spoken "upload a document") jumps straight to the upload box.
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash !== "#upload") return;
      if (flow.doc) flow.reset();
      autoStarted.current = true;
      window.history.replaceState(null, "", "/form");
      setTimeout(() => {
        const el = document.getElementById("upload-section");
        el?.scrollIntoView({ block: "start" });
        (el?.querySelector("input[type=file]") as HTMLInputElement | null)?.focus();
        announce("Upload a Document. Choose a PDF or drag it here.");
      }, 50);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.doc]);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!/pdf$/i.test(file.name) && file.type !== "application/pdf") {
      setUploadError("Please choose a PDF file.");
      announce("Please choose a PDF file.", { assertive: true });
      return;
    }
    setUploadError(null);
    setUploading(true);
    announce("Reading your document");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/parse-pdf", { method: "POST", body: fd });
      const json = await r.json();
      if (!r.ok || !json.document) throw new Error(json.error || "I couldn't read that document.");
      await flow.loadDocument(json.document);
    } catch (err) {
      setUploadError((err as Error).message);
      announce((err as Error).message, { assertive: true });
    } finally {
      setUploading(false);
    }
  };

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = "";
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onDownload = async () => {
    if (!flow.doc) return;
    setDownloading(true);
    announce("Preparing your completed PDF");
    try {
      const bytes = await buildCompletedPdf(flow.doc, flow.answers);
      downloadPdf(bytes, `${flow.doc.title.replace(/[^\w\- ]+/g, "").trim() || "ClearForm"} - completed.pdf`);
      announce("Your completed PDF has downloaded. The signature line is blank for you to sign.", { toast: true });
    } catch (err) {
      announce("Sorry, the PDF could not be created. " + (err as Error).message, { assertive: true });
    } finally {
      setDownloading(false);
    }
  };

  const onReview = () => {
    setReviewing(true);
    announce("Reviewing answers. Each field is listed with its status.");
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    previewRef.current?.focus();
  };

  /* ---------- Choose a document ---------- */
  if (!flow.doc) {
    return (
      <div className="container section-tight">
        <div className="section-title" style={{ textAlign: "left", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "2.2rem" }}>Complete a form by voice</h1>
          <p style={{ marginInline: 0 }}>Choose a sample form or upload a PDF. ClearForm asks one question at a time, repeats what it heard, and only fills a field after you confirm.</p>
        </div>
        <div className="choose">
          <section className="card" aria-labelledby="sample-title">
            <DocIcon width={32} height={32} style={{ color: "var(--action)" }} />
            <h2 id="sample-title">Try Sample Healthcare Form</h2>
            <p>A realistic patient registration form with nine information fields and one signature field. Perfect for a quick walkthrough.</p>
            <button type="button" className="btn btn-primary btn-lg" onClick={loadSample}>
              Try Sample Healthcare Form
            </button>
          </section>
          <section className="card" aria-labelledby="upload-title" id="upload-section">
            <UploadIcon width={32} height={32} style={{ color: "var(--action)" }} />
            <h2 id="upload-title">Upload a Document</h2>
            <p>Upload a PDF. If it has fillable fields, ClearForm guides you through each one and returns the completed original. Signature fields are always left blank.</p>
            <div className={`dropzone`} data-over={over} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
              <label className="btn btn-secondary btn-lg" style={{ cursor: "pointer" }}>
                <UploadIcon className="icon" /> {uploading ? "Reading document…" : "Choose a PDF"}
                <input type="file" accept="application/pdf,.pdf" onChange={onInput} disabled={uploading} aria-describedby="upload-help" />
              </label>
              <p id="upload-help" className="muted small" style={{ margin: "0.75rem 0 0" }}>
                Or drag a PDF here. Up to 15 MB. Processed for this session only.
              </p>
            </div>
            {uploadError && (
              <div className="notice notice-error" role="alert">
                <WarningIcon className="icon" />
                <div>{uploadError}</div>
              </div>
            )}
          </section>
        </div>
        <p className="muted small" style={{ marginTop: "1.5rem", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
          <ShieldIcon width={18} height={18} style={{ flex: "none", marginTop: 2 }} />
          {PRIVACY_STATEMENT}
        </p>
      </div>
    );
  }

  /* ---------- Two-column form workspace ---------- */
  return (
    <div className="container">
      <div className="form-layout">
        <div className="stack" ref={previewRef} tabIndex={-1} aria-label="Document preview">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.5rem", margin: 0 }}>{reviewing ? "Review your answers" : "Document preview"}</h1>
            <button type="button" className="btn btn-ghost" onClick={() => { flow.reset(); setReviewing(false); }}>
              Choose a different document
            </button>
          </div>
          <FormMatchCard doc={flow.doc} onSpeak={flow.speakText} />
          <DocumentPreview doc={flow.doc} answers={flow.answers} activeIndex={flow.index} onJump={flow.started ? flow.goTo : undefined} />
          {flow.doc.fields.length === 0 && (
            <div className="notice notice-warning" role="note">
              <WarningIcon className="icon" />
              <div>
                <strong>No fillable fields found</strong>
                I can explain what fields on this document mean, but I can&rsquo;t determine what the document says or fill it safely. Try the Understand a Document section instead.
              </div>
            </div>
          )}
        </div>
        <div className="assistant-col stack">
          <VoiceAssistant flow={flow} onDownload={onDownload} onReview={onReview} downloading={downloading} />
          <AskClearForm context={flow.doc.detectedType} suggestions={["What is this form used for?", "What is a policy number?", "What does emergency contact mean?", "What is a primary care physician?"]} />
        </div>
      </div>
    </div>
  );
}
