"use client";

import { useState, type FormEvent } from "react";
import type { useFormFlow } from "@/lib/useFormFlow";
import { Wave, StatePill } from "./Wave";
import { CheckIcon, DownloadIcon, InfoIcon, MicIcon, PenIcon, RetryIcon, SpeakerIcon, StopIcon, WarningIcon } from "./Icons";

type Flow = ReturnType<typeof useFormFlow>;

export function VoiceAssistant({
  flow,
  onDownload,
  onReview,
  downloading,
}: {
  flow: Flow;
  onDownload: () => void;
  onReview: () => void;
  downloading?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const { current, state, questionNumber, totalQuestions, transcript, interim, pending, message, error, stats } = flow;
  const listening = state === "listening";
  const busy = state === "speaking" || state === "transcribing";
  const progress = totalQuestions ? Math.round((stats.confirmed + stats.review) / totalQuestions * 100) : 0;

  const onTyped = (e: FormEvent) => {
    e.preventDefault();
    if (!typed.trim()) return;
    flow.submitTyped(typed);
    setTyped("");
  };

  /* ---- Complete ---- */
  if (state === "complete") {
    return (
      <section className="card assistant" aria-labelledby="assistant-title">
        <div className="assistant-top">
          <h2 id="assistant-title" style={{ margin: 0 }}>
            Your form is ready.
          </h2>
          <StatePill state={state} />
        </div>
        <Wave state="complete" />
        <div className="summary-stats" role="list">
          <div className="stat" role="listitem">
            <span className="n">{stats.confirmed}</span>
            <span className="l">Confirmed fields</span>
          </div>
          <div className="stat" role="listitem">
            <span className="n">{stats.review}</span>
            <span className="l">Marked for review</span>
          </div>
          <div className="stat" role="listitem">
            <span className="n">{stats.signature ? "Blank" : "None"}</span>
            <span className="l">Signature — left for you</span>
          </div>
          <div className="stat" role="listitem">
            <span className="n">0</span>
            <span className="l">Values guessed</span>
          </div>
        </div>
        {stats.signature && (
          <div className="notice notice-error" role="note">
            <PenIcon className="icon" />
            <div>
              <strong>Signature Required</strong>
              Not completed by ClearForm. Please sign the downloaded document yourself.
            </div>
          </div>
        )}
        <div className="assistant-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={onDownload} disabled={downloading}>
            <DownloadIcon className="icon" /> {downloading ? "Preparing PDF…" : "Download Completed PDF"}
          </button>
          <button type="button" className="btn btn-secondary btn-lg" onClick={onReview}>
            Review Answers
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => flow.speakText(message)}>
            <SpeakerIcon className="icon" /> Hear summary again
          </button>
        </div>
      </section>
    );
  }

  /* ---- Not started ---- */
  if (!flow.started) {
    return (
      <section className="card assistant" aria-labelledby="assistant-title">
        <div className="assistant-top">
          <h2 id="assistant-title" style={{ margin: 0 }}>
            ClearForm
          </h2>
          <StatePill state={state} />
        </div>
        <Wave state={state} />
        <p className="question" style={{ fontSize: "1.3rem" }}>
          {message || flow.doc?.intro}
        </p>
        <div className="assistant-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={flow.start} disabled={!flow.doc || flow.doc.fields.length === 0}>
            <MicIcon className="icon" /> Start Voice Guidance
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => flow.speakText(flow.doc?.intro ?? "")}>
            <SpeakerIcon className="icon" /> Hear again
          </button>
        </div>
      </section>
    );
  }

  /* ---- Active question ---- */
  const isSignature = current?.kind === "signature";
  return (
    <section className="card assistant" aria-labelledby="assistant-title">
      <div className="assistant-top">
        <h2 id="assistant-title" style={{ margin: 0, fontSize: "1.1rem" }}>
          {isSignature ? "Signature" : `Question ${questionNumber} of ${totalQuestions}`}
        </h2>
        <StatePill state={state} />
      </div>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={`Form progress: ${stats.confirmed + stats.review} of ${totalQuestions} fields handled`}>
        <div style={{ width: `${progress}%` }} />
      </div>

      <Wave state={state} level={flow.level} />

      <p className="question" id="current-question">
        {current?.question}
      </p>

      {current?.help && !isSignature && (
        <details className="help">
          <summary>
            <InfoIcon className="icon" /> What does this mean?
          </summary>
          <div className="help-text">{current.help}</div>
        </details>
      )}

      {!isSignature && (
        <div className="transcript" aria-live="off">
          <span className="who">You said</span>
          {interim || transcript ? <span>{interim || transcript}</span> : <span className="placeholder">{listening ? "Listening… speak now." : "Your answer will appear here."}</span>}
        </div>
      )}

      {pending != null && (
        <div className="readback" role="group" aria-labelledby="readback-label">
          <span className="who" id="readback-label" style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
            ClearForm heard
          </span>
          <strong style={{ fontSize: "1.25rem" }}>{pending}</strong>
          <p style={{ margin: "0.4rem 0 0" }}>Is that correct?</p>
          <div className="confirm-row">
            <button type="button" className="btn btn-success btn-lg" onClick={flow.confirmPending} disabled={busy}>
              <CheckIcon className="icon" /> Yes, that&rsquo;s correct
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={flow.retryPending} disabled={busy}>
              <RetryIcon className="icon" /> Try again
            </button>
          </div>
        </div>
      )}

      {state === "needs-review" && !pending && !isSignature && (
        <div className="notice notice-warning" role="alert" style={{ marginTop: "1rem" }}>
          <WarningIcon className="icon" />
          <div>
            <strong>I may not have heard that correctly.</strong>
            {message}
          </div>
        </div>
      )}

      {error && (
        <div className="notice notice-error" role="alert" style={{ marginTop: "1rem" }}>
          <WarningIcon className="icon" />
          <div>{error}</div>
        </div>
      )}

      {isSignature ? (
        <div className="notice notice-error" role="note" style={{ marginTop: "1rem" }}>
          <PenIcon className="icon" />
          <div>
            <strong>Signature Required</strong>
            Not completed by ClearForm.
          </div>
        </div>
      ) : (
        <>
          <div className="assistant-actions">
            <button type="button" className={`btn ${listening ? "btn-success" : "btn-primary"} btn-lg mic-btn`} data-listening={listening} onClick={flow.pressMic} disabled={busy} aria-pressed={listening}>
              {listening ? <StopIcon className="icon" /> : <MicIcon className="icon" />}
              {listening ? "Stop listening" : pending ? "Answer yes or no" : "Speak your answer"}
            </button>
            {(state === "speaking" || listening) && (
              <button type="button" className="btn btn-secondary" onClick={flow.stopAll}>
                <StopIcon className="icon" /> Stop
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={flow.repeatQuestion} disabled={busy}>
              <SpeakerIcon className="icon" /> Repeat
            </button>
            <button type="button" className="btn btn-ghost" onClick={flow.explainField} disabled={busy}>
              <InfoIcon className="icon" /> Explain this field
            </button>
            <button type="button" className="btn btn-ghost" onClick={flow.markForReview} disabled={busy}>
              <WarningIcon className="icon" /> Skip &amp; mark for review
            </button>
          </div>
          <form className="type-fallback" onSubmit={onTyped}>
            <label htmlFor="typed-answer" className="visually-hidden">
              Type your answer instead
            </label>
            <input id="typed-answer" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Or type your answer…" autoComplete="off" disabled={busy || listening} />
            <button type="submit" className="btn btn-secondary" disabled={busy || listening || !typed.trim()}>
              Submit
            </button>
          </form>
        </>
      )}
    </section>
  );
}
