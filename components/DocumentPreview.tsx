"use client";

import type { FieldAnswer, FormDocument } from "@/lib/types";
import { CheckIcon, PenIcon, WarningIcon } from "./Icons";

function StatusBadge({ status }: { status: FieldAnswer["status"] }) {
  switch (status) {
    case "confirmed":
      return (
        <span className="badge badge-success">
          <CheckIcon width={14} height={14} /> Confirmed
        </span>
      );
    case "needs-review":
      return (
        <span className="badge badge-warning">
          <WarningIcon width={14} height={14} /> Needs review
        </span>
      );
    case "unreadable":
      return (
        <span className="badge badge-error">
          <WarningIcon width={14} height={14} /> Unreadable
        </span>
      );
    case "signature":
      return (
        <span className="badge badge-error">
          <PenIcon width={14} height={14} /> Signature required
        </span>
      );
    case "active":
      return <span className="badge badge-info">Current question</span>;
    default:
      return <span className="badge badge-muted">Pending</span>;
  }
}

export function DocumentPreview({
  doc,
  answers,
  activeIndex,
  onJump,
}: {
  doc: FormDocument;
  answers: Record<string, FieldAnswer>;
  activeIndex: number;
  onJump?: (idx: number) => void;
}) {
  return (
    <section className="card doc-preview" aria-labelledby="doc-title">
      <div className="doc-head">
        <h2 id="doc-title">{doc.title}</h2>
        <p className="muted" style={{ margin: 0 }}>
          Detected: {doc.detectedType} · {doc.fields.filter((f) => f.kind !== "signature").length} information fields ·{" "}
          {doc.fields.filter((f) => f.kind === "signature").length} signature field
        </p>
      </div>
      <div className="doc-paper" role="list" aria-label="Document fields and their status">
        {doc.fields.map((f, i) => {
          const a = answers[f.id];
          const status: FieldAnswer["status"] = f.kind === "signature" ? (a?.status ?? "pending") : i === activeIndex && a?.status !== "confirmed" ? "active" : (a?.status ?? "pending");
          return (
            <div key={f.id} className="doc-field" data-status={status === "pending" && f.kind === "signature" ? "pending" : status} role="listitem">
              <span className="label">
                {f.kind !== "signature" ? `${doc.fields.filter((x) => x.kind !== "signature").indexOf(f) + 1}. ` : ""}
                {f.label}
              </span>
              <StatusBadge status={status} />
              <div className="value">
                {f.kind === "signature" ? (
                  <>
                    <span className="sig-line" aria-hidden="true" />
                    <span>Signature required — not completed by ClearForm</span>
                  </>
                ) : a?.status === "confirmed" ? (
                  <span>{a.value}</span>
                ) : a?.status === "needs-review" ? (
                  <span>Human review required — left blank</span>
                ) : (
                  <span className="muted">{f.placeholder ?? "Not filled yet"}</span>
                )}
              </div>
              {onJump && f.kind !== "signature" && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <button type="button" className="btn btn-ghost" style={{ minHeight: 44, padding: "0.3rem 0.8rem" }} onClick={() => onJump(i)} aria-label={`Answer ${f.label} again`}>
                    {a?.status === "confirmed" ? "Change answer" : "Answer this"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
