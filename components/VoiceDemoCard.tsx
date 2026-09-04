"use client";

import { useEffect, useRef, useState } from "react";
import type { AssistantState } from "@/lib/types";
import { speak, stopSpeaking } from "@/lib/voice";
import { speedToRate, useSettings } from "@/lib/settings";
import { useAnnounce } from "./Announcer";
import { Wave } from "./Wave";
import { CheckIcon, PlayIcon, RetryIcon, SpeakerIcon, StopIcon } from "./Icons";

type Step = { state: AssistantState; pill: string; who: "ClearForm" | "You"; text: string; speak?: string; hold: number };

const STEPS: Step[] = [
  { state: "ready", pill: "ClearForm is ready", who: "ClearForm", text: "Press start and I'll ask you one question at a time.", hold: 0 },
  { state: "speaking", pill: "Speaking", who: "ClearForm", text: "What is your full name?", speak: "What is your full name?", hold: 600 },
  { state: "listening", pill: "Listening", who: "You", text: "Roshni Kobula Raja.", hold: 2200 },
  { state: "awaiting-confirmation", pill: "Waiting for confirmation", who: "ClearForm", text: "I heard Roshni Kobula Raja. Is that correct?", speak: "I heard Roshni Kobula Raja. Is that correct?", hold: 2200 },
  { state: "confirmed", pill: "Confirmed", who: "ClearForm", text: "Confirmed. Full name filled: Roshni Kobula Raja.", speak: "Confirmed. Full name filled.", hold: 0 },
];

/** Live voice-demo card on the home page: plays one full turn with real voice. */
export function VoiceDemoCard() {
  const { settings } = useSettings();
  const announce = useAnnounce();
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const run = useRef(0);
  const step = STEPS[i];

  useEffect(() => () => stopSpeaking(), []);

  const play = async () => {
    if (playing) {
      run.current++;
      stopSpeaking();
      setPlaying(false);
      setI(0);
      announce("Example stopped");
      return;
    }
    const id = ++run.current;
    setPlaying(true);
    for (let n = 1; n < STEPS.length; n++) {
      if (id !== run.current) return;
      setI(n);
      const s = STEPS[n];
      announce(`${s.pill}. ${s.text}`);
      if (s.speak) await speak(s.speak, { rate: speedToRate(settings.voiceSpeed), enabled: settings.voiceGuidance });
      if (id !== run.current) return;
      if (s.hold) await new Promise((r) => setTimeout(r, s.hold));
    }
    if (id === run.current) setPlaying(false);
  };

  return (
    <section className="card demo-card" aria-labelledby="demo-title">
      <div className="demo-head">
        <h2 className="demo-title" id="demo-title">
          How a turn sounds
        </h2>
        <span className="state-pill" data-state={step.state}>
          <SpeakerIcon width={16} height={16} /> {step.pill}
        </span>
      </div>
      <div className="demo-wave">
        <Wave state={step.state} level={step.state === "listening" ? 0.6 : 0} />
      </div>
      <div aria-live="polite">
        <span className="who">{step.who}</span>
        <p className="demo-text">{step.text}</p>
        {step.state === "awaiting-confirmation" && (
          <div className="demo-choices" aria-hidden="true">
            <span className="btn btn-success"><CheckIcon className="icon" /> Yes, that&rsquo;s correct</span>
            <span className="btn btn-secondary"><RetryIcon className="icon" /> Try again</span>
          </div>
        )}
      </div>
      <div className="demo-controls">
        <button type="button" className="btn btn-navy" onClick={play} aria-pressed={playing}>
          {playing ? <StopIcon className="icon" /> : <PlayIcon className="icon" />}
          {playing ? "Stop the example" : "Play the example"}
        </button>
        <span className="muted">Step {i + 1} of {STEPS.length}</span>
      </div>
    </section>
  );
}
