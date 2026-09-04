"use client";

import { useEffect, useRef, useState } from "react";
import { speak, stopSpeaking } from "@/lib/voice";
import { speedToRate, useSettings } from "@/lib/settings";
import { useAnnounce } from "./Announcer";
import { useVoiceCommand } from "./VoiceCommand";
import { MicIcon, StopIcon } from "./Icons";

/**
 * Large round "Tap to hear ClearForm" control. Reads the page aloud, then asks
 * what the user wants to do and navigates by voice (e.g. "upload a document").
 */
export function ReadPageButton({ text }: { text: string }) {
  const { settings } = useSettings();
  const announce = useAnnounce();
  const { run, listening } = useVoiceCommand();
  const [speaking, setSpeaking] = useState(false);
  const toggleRef = useRef<() => void>(() => {});
  useEffect(() => () => stopSpeaking(), []);

  // Hands-free entry: announce on arrival, and let Space start the reading from anywhere on the page.
  useEffect(() => {
    const t = window.setTimeout(() => announce("ClearForm. Press Space, or tap the microphone, to hear this page read aloud."), 800);
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === " " && !["INPUT", "TEXTAREA", "BUTTON", "A", "SELECT"].includes(tag) && !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault();
        toggleRef.current();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [announce]);

  const toggle = async () => {
    if (speaking || listening) {
      stopSpeaking();
      setSpeaking(false);
      if (listening) run(); // toggles listening off
      announce("Stopped");
      return;
    }
    setSpeaking(true);
    announce("Reading this page aloud");
    await speak(text, { rate: speedToRate(settings.voiceSpeed), enabled: true });
    setSpeaking(false);
    // Hand over to voice navigation so the page is usable without sight.
    await run({ prompt: true });
  };

  toggleRef.current = toggle;

  const label = listening ? "Listening… say where to go" : speaking ? "Reading… tap to stop" : "Tap to hear ClearForm";
  return (
    <div className="hear-block">
      <button type="button" className="hear-btn" onClick={toggle} aria-pressed={speaking || listening} aria-describedby="hear-help" data-speaking={speaking || listening}>
        {speaking || listening ? <StopIcon width={40} height={40} /> : <MicIcon width={40} height={40} />}
        <span className="visually-hidden">{speaking || listening ? "Stop" : "Read this page to me"}</span>
      </button>
      <strong aria-live="polite">{label}</strong>
      <span id="hear-help" className="muted small">
        Or press Space. ClearForm reads this page out loud, then you can say &ldquo;upload a document&rdquo; or &ldquo;start with voice&rdquo;.
      </span>
    </div>
  );
}
