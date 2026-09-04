"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { listen, speak, stopListening, stopSpeaking } from "@/lib/voice";
import { speedToRate, useSettings } from "@/lib/settings";
import { COMMAND_PROMPT, parseCommand } from "@/lib/commands";
import { useAnnounce } from "./Announcer";
import { MicIcon, StopIcon } from "./Icons";

/** Shared hook: ask what the user wants to do, listen once, and navigate. */
export function useVoiceCommand() {
  const router = useRouter();
  const { settings } = useSettings();
  const announce = useAnnounce();
  const [listening, setListening] = useState(false);

  const say = useCallback(
    async (text: string) => {
      announce(text);
      await speak(text, { rate: speedToRate(settings.voiceSpeed), enabled: settings.voiceGuidance });
    },
    [announce, settings.voiceGuidance, settings.voiceSpeed],
  );

  const run = useCallback(
    async (opts: { prompt?: boolean; onReadPage?: () => void } = {}) => {
      if (listening) {
        stopListening();
        setListening(false);
        return;
      }
      stopSpeaking();
      if (opts.prompt !== false) await say(COMMAND_PROMPT);
      setListening(true);
      announce("Listening for a command");
      let transcript = "";
      try {
        const r = await listen({ maxMs: 8000 });
        transcript = r.transcript;
      } catch (err) {
        setListening(false);
        await say((err as Error).message);
        return;
      }
      setListening(false);
      if (!transcript) {
        await say("I didn't catch that. Please try again, or use the buttons on the page.");
        return;
      }
      const cmd = parseCommand(transcript);
      if (!cmd) {
        await say(`I heard "${transcript}", but I don't have a command for that. You can say: upload a document, start with voice, or understand a document.`);
        return;
      }
      announce(cmd.say, { toast: true });
      if (cmd.href) {
        router.push(cmd.href);
        // Speak after navigation starts so the page change is not cancelled by the audio.
        speak(cmd.say, { rate: speedToRate(settings.voiceSpeed), enabled: settings.voiceGuidance });
      } else if (cmd.id === "read-page") {
        opts.onReadPage?.();
      } else {
        await say(cmd.say);
      }
    },
    [announce, listening, router, say, settings.voiceGuidance, settings.voiceSpeed],
  );

  return { run, listening };
}

/** Header button: press, say where you want to go. */
export function VoiceCommandButton() {
  const { run, listening } = useVoiceCommand();
  return (
    <button type="button" className={`btn ${listening ? "btn-success" : "btn-primary"}`} onClick={() => run()} aria-pressed={listening} title="Say where you want to go, e.g. upload a document">
      {listening ? <StopIcon className="icon" /> : <MicIcon className="icon" />}
      <span className="vc-label">{listening ? "Listening…" : "Voice command"}</span>
    </button>
  );
}
