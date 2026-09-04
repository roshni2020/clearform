"use client";

import { useState, type FormEvent } from "react";
import type { Explanation } from "@/lib/types";
import { listen, speak, stopSpeaking } from "@/lib/voice";
import { speedToRate, useSettings } from "@/lib/settings";
import { useAnnounce } from "./Announcer";
import { InfoIcon, MicIcon, ShieldIcon, SpeakerIcon, StopIcon, WarningIcon } from "./Icons";

type Result =
  | { kind: "explanation"; explanation: Explanation }
  | { kind: "refused"; message: string }
  | { kind: "notFound"; message: string }
  | { kind: "error"; message: string };

const DEFAULT_SUGGESTIONS = ["What does prior authorization mean?", "What is a deductible?", "What is HbA1c?", "What is this form used for?"];

export function AskClearForm({
  context,
  suggestions = DEFAULT_SUGGESTIONS,
  heading = "Ask ClearForm about this document",
  initialQuestion,
}: {
  context?: string;
  suggestions?: string[];
  heading?: string;
  initialQuestion?: string;
}) {
  const { settings } = useSettings();
  const announce = useAnnounce();
  const [q, setQ] = useState(initialQuestion ?? "");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const say = async (text: string) => {
    setSpeaking(true);
    announce(text);
    await speak(text, { rate: speedToRate(settings.voiceSpeed), enabled: settings.voiceGuidance });
    setSpeaking(false);
  };

  const ask = async (question: string) => {
    const query = question.trim();
    if (!query) return;
    stopSpeaking();
    setLoading(true);
    setResult(null);
    announce("Looking up a trusted explanation");
    try {
      const r = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query, context }),
      });
      const json = await r.json();
      let next: Result;
      if (json.refused) next = { kind: "refused", message: json.message };
      else if (json.notFound) next = { kind: "notFound", message: json.message };
      else if (json.explanation) next = { kind: "explanation", explanation: json.explanation };
      else next = { kind: "error", message: "Something went wrong. Please try again." };
      setResult(next);
      setLoading(false);
      if (next.kind === "explanation") {
        const e = next.explanation;
        await say(`${e.explanation} This explanation comes from ${e.sourceName}.`);
      } else await say(next.message);
    } catch {
      setLoading(false);
      setResult({ kind: "error", message: "I couldn't reach the explanation service. Please try again." });
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    ask(q);
  };

  const onMic = async () => {
    stopSpeaking();
    setListening(true);
    announce("Listening for your question");
    try {
      const r = await listen({ onInterim: setQ, maxMs: 10000 });
      setListening(false);
      if (r.transcript) {
        setQ(r.transcript);
        await ask(r.transcript);
      } else {
        announce("I didn't catch a question. Please try again.", { assertive: true });
      }
    } catch (err) {
      setListening(false);
      setResult({ kind: "error", message: (err as Error).message });
    }
  };

  return (
    <section className="card" aria-labelledby="ask-title">
      <h2 id="ask-title" style={{ fontSize: "1.35rem" }}>
        {heading}
      </h2>
      <p className="muted" style={{ marginTop: "-0.25rem" }}>
        Ask by voice or text. ClearForm explains terms using official sources and never guesses your personal values.
      </p>
      <form className="ask-form" onSubmit={onSubmit}>
        <label htmlFor="ask-input" className="visually-hidden">
          Your question
        </label>
        <input id="ask-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. What is a deductible?" autoComplete="off" />
        <button type="button" className={`btn ${listening ? "btn-success" : "btn-secondary"}`} onClick={onMic} aria-pressed={listening} disabled={loading}>
          {listening ? <StopIcon className="icon" /> : <MicIcon className="icon" />}
          {listening ? "Listening…" : "Ask by voice"}
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading || !q.trim()}>
          {loading ? "Searching…" : "Ask"}
        </button>
      </form>
      <ul className="ask-suggest" aria-label="Example questions">
        {suggestions.map((s) => (
          <li key={s}>
            <button type="button" onClick={() => { setQ(s); ask(s); }}>
              {s}
            </button>
          </li>
        ))}
      </ul>

      <div aria-live="polite">
        {result?.kind === "explanation" && (
          <div className="answer">
            <span className="term">{result.explanation.term}</span>
            <p className="explain">{result.explanation.explanation}</p>
            <div className="source">
              <span className="src-name">
                <ShieldIcon width={16} height={16} style={{ verticalAlign: "-3px", marginRight: 4 }} />
                Source: {result.explanation.sourceName}
              </span>
              <a href={result.explanation.sourceUrl} target="_blank" rel="noopener noreferrer">
                Open source link
              </a>
              <span className={`badge ${result.explanation.trusted ? "badge-success" : "badge-warning"}`}>
                {result.explanation.trusted ? "Trusted source" : "Unverified source"}
              </span>
              <span className="badge badge-muted">{result.explanation.provider === "linkup" ? "Found with Linkup" : "Built-in glossary"}</span>
              <button type="button" className="btn btn-ghost" onClick={() => (speaking ? (stopSpeaking(), setSpeaking(false)) : say(result.explanation.explanation))}>
                {speaking ? <StopIcon className="icon" /> : <SpeakerIcon className="icon" />}
                {speaking ? "Stop" : "Hear explanation"}
              </button>
            </div>
          </div>
        )}
        {result?.kind === "refused" && (
          <div className="notice notice-warning" style={{ marginTop: "1.25rem" }}>
            <ShieldIcon className="icon" />
            <div>
              <strong>ClearForm won&rsquo;t guess this</strong>
              {result.message}
            </div>
          </div>
        )}
        {result?.kind === "notFound" && (
          <div className="notice notice-info" style={{ marginTop: "1.25rem" }}>
            <InfoIcon className="icon" />
            <div>{result.message}</div>
          </div>
        )}
        {result?.kind === "error" && (
          <div className="notice notice-error" style={{ marginTop: "1.25rem" }} role="alert">
            <WarningIcon className="icon" />
            <div>{result.message}</div>
          </div>
        )}
      </div>
    </section>
  );
}
