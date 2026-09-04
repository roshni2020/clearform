"use client";

import { useState } from "react";
import { LAB_DOCUMENT, LOW_CONFIDENCE_THRESHOLD, documentToSpeech, rowToSpeech } from "@/lib/labDocument";
import { speak, stopSpeaking } from "@/lib/voice";
import { speedToRate, useSettings } from "@/lib/settings";
import { useAnnounce } from "@/components/Announcer";
import { AskClearForm } from "@/components/AskClearForm";
import { StatePill, Wave } from "@/components/Wave";
import { CheckIcon, InfoIcon, ShieldIcon, SpeakerIcon, StopIcon, WarningIcon } from "@/components/Icons";

export function UnderstandClient() {
  const { settings } = useSettings();
  const announce = useAnnounce();
  const [active, setActive] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [askTerm, setAskTerm] = useState<string | undefined>(undefined);
  const [lastSpoken, setLastSpoken] = useState("");
  const doc = LAB_DOCUMENT;

  const say = async (text: string) => {
    stopSpeaking();
    setSpeaking(true);
    setLastSpoken(text);
    announce(text);
    await speak(text, { rate: speedToRate(settings.voiceSpeed), enabled: settings.voiceGuidance });
    setSpeaking(false);
  };

  const readRow = (i: number) => {
    setActive(i);
    say(rowToSpeech(doc.rows[i]));
  };
  const readAll = () => {
    setActive(null);
    say(documentToSpeech(doc));
  };
  const stop = () => {
    stopSpeaking();
    setSpeaking(false);
    announce("Stopped");
  };

  const reviewCount = doc.rows.filter((r) => r.confidence < LOW_CONFIDENCE_THRESHOLD).length;

  return (
    <div className="container">
      <div className="understand-layout">
        <div className="stack">
          <div>
            <h1 style={{ fontSize: "2rem" }}>Understand a Document</h1>
            <p className="muted" style={{ fontSize: "1.1rem" }}>
              ClearForm reads structured documents aloud while keeping every value with its label, and tells you when it isn&rsquo;t sure. It never interprets results.
            </p>
          </div>

          <section className="card" aria-labelledby="lab-title">
            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
              <div>
                <h2 id="lab-title" style={{ fontSize: "1.3rem", marginBottom: "0.2rem" }}>
                  {doc.title}
                </h2>
                <p className="muted" style={{ margin: 0 }}>
                  Detected: {doc.detectedType} · {doc.collected}
                </p>
              </div>
              <span className="badge badge-info">Sample document</span>
            </div>

            <div className="row-controls">
              <button type="button" className="btn btn-primary btn-lg" onClick={readAll}>
                <SpeakerIcon className="icon" /> Read whole document
              </button>
              {speaking && (
                <button type="button" className="btn btn-secondary btn-lg" onClick={stop}>
                  <StopIcon className="icon" /> Stop
                </button>
              )}
            </div>

            <div className="table-wrap" style={{ marginTop: "1.25rem" }}>
              <table className="lab">
                <caption className="visually-hidden">Lab results with test name, result, units and reference range. Each row has controls to read it aloud or ask about the term.</caption>
                <thead>
                  <tr>
                    {doc.columns.map((c) => (
                      <th key={c} scope="col">
                        {c}
                      </th>
                    ))}
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className="visually-hidden">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {doc.rows.map((row, i) => {
                    const review = row.confidence < LOW_CONFIDENCE_THRESHOLD;
                    return (
                      <tr key={row.test} data-active={active === i} data-review={review}>
                        <th scope="row">{row.test}</th>
                        <td className="result">{review ? "Unreadable" : row.result}</td>
                        <td>{row.units}</td>
                        <td>{row.range}</td>
                        <td>
                          {review ? (
                            <span className="badge badge-warning">
                              <WarningIcon width={14} height={14} /> Needs review
                            </span>
                          ) : (
                            <span className="badge badge-success">
                              <CheckIcon width={14} height={14} /> Confirmed
                            </span>
                          )}
                        </td>
                        <td className="actions">
                          <button type="button" className="btn btn-secondary" onClick={() => readRow(i)} aria-label={`Read the ${row.test} row aloud`}>
                            <SpeakerIcon className="icon" /> Read this row
                          </button>{" "}
                          <button type="button" className="btn btn-ghost" onClick={() => { setAskTerm(`What is ${row.test}?`); document.getElementById("ask-input")?.focus(); }} aria-label={`Ask about the term ${row.test}`}>
                            <InfoIcon className="icon" /> Ask about this term
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {reviewCount > 0 && (
              <div className="notice notice-warning" role="note" style={{ marginTop: "1rem" }}>
                <WarningIcon className="icon" />
                <div>
                  <strong>Human Review Required</strong>
                  {reviewCount} value{reviewCount === 1 ? "" : "s"} could not be read confidently. ClearForm will not read an interpreted value as fact and has marked it for review instead of guessing.
                </div>
              </div>
            )}
            <div className="notice notice-info" role="note" style={{ marginTop: "0.75rem" }}>
              <ShieldIcon className="icon" />
              <div>
                <strong>ClearForm reads, it does not diagnose.</strong>
                It will not say whether a result is healthy or unhealthy or recommend treatment. Please discuss results with your health care provider.
              </div>
            </div>
          </section>
        </div>

        <div className="stack">
          <section className="card assistant" aria-label="Reading status">
            <div className="assistant-top">
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>ClearForm</h2>
              <StatePill state={speaking ? "speaking" : "ready"} />
            </div>
            <Wave state={speaking ? "speaking" : "ready"} />
            <p style={{ fontSize: "1.1rem", minHeight: "3rem" }}>{lastSpoken || "Choose a row to hear it read aloud, or read the whole document."}</p>
            {lastSpoken && !speaking && (
              <button type="button" className="btn btn-ghost" onClick={() => say(lastSpoken)}>
                <SpeakerIcon className="icon" /> Hear again
              </button>
            )}
          </section>
          <AskClearForm key={askTerm} initialQuestion={askTerm} context="laboratory results report" suggestions={["What is HbA1c?", "What is a reference range?", "What is creatinine?", "What does glucose measure?"]} />
        </div>
      </div>
    </div>
  );
}
