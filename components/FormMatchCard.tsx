"use client";

import { useEffect, useState } from "react";
import type { FormDocument, FormMatch } from "@/lib/types";
import { DocIcon, InfoIcon, SpeakerIcon } from "./Icons";

/**
 * Official-form matching via Linkup. States its uncertainty explicitly and never
 * claims a confident match without an official source.
 */
export function FormMatchCard({ doc, onSpeak }: { doc: FormDocument; onSpeak: (text: string) => void }) {
  const [match, setMatch] = useState<FormMatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setMatch(null);
    const excerpt = [doc.fields.map((f) => f.label).join(", "), doc.extractedText?.slice(0, 800)].filter(Boolean).join(". ");
    fetch("/api/match-form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: doc.title, excerpt }),
    })
      .then((r) => r.json())
      .then((j) => alive && setMatch(j.match ?? null))
      .catch(() => alive && setMatch(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [doc]);

  if (loading) {
    return (
      <div className="card card-tight" aria-busy="true">
        <p className="muted" style={{ margin: 0 }}>
          <DocIcon width={18} height={18} style={{ verticalAlign: "-4px", marginRight: 6 }} />
          Checking whether this is a known official form…
        </p>
      </div>
    );
  }
  if (!match) return null;

  let text: string;
  let tone = "notice-info";
  if (match.matched && match.confident) {
    text = `This appears to be ${match.formName}. I found the official guidance for this form${match.sourceName ? ` from ${match.sourceName}` : ""}. Would you like me to explain each section as we go?`;
  } else if (match.matched) {
    text = `I found a possible match — ${match.formName} — but I'm not confident enough to identify this form with certainty.`;
    tone = "notice-warning";
  } else if (match.provider === "local") {
    text = match.summary ?? "Official form matching is not available right now.";
  } else {
    text = "This does not appear to be a specific published official form. It looks like a general-purpose form, so I'll guide you through it field by field.";
  }

  return (
    <div className={`notice ${tone}`} role="note" aria-label="Official form match">
      <InfoIcon className="icon" />
      <div style={{ flex: 1 }}>
        <strong>{match.matched && match.confident ? "Official form identified" : match.matched ? "Possible match" : "Form matching"}</strong>
        {text}
        {match.summary && match.matched && <p style={{ margin: "0.4rem 0 0" }}>{match.summary}</p>}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.6rem", alignItems: "center" }}>
          {match.sourceUrl && (
            <a href={match.sourceUrl} target="_blank" rel="noopener noreferrer">
              Official guidance{match.sourceName ? ` — ${match.sourceName}` : ""}
            </a>
          )}
          <button type="button" className="btn btn-ghost" style={{ minHeight: 44 }} onClick={() => onSpeak(text)}>
            <SpeakerIcon className="icon" /> Hear this
          </button>
          <span className="badge badge-muted">{match.provider === "linkup" ? "Checked with Linkup" : "Linkup not configured"}</span>
        </div>
      </div>
    </div>
  );
}
