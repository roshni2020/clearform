"use client";

import { useEffect } from "react";
import { stopListening, stopSpeaking } from "@/lib/voice";
import { useAnnounce } from "./Announcer";

export const STOP_EVENT = "clearform:stop";

/** Fire the app-wide stop: halts speech and listening, and lets any page reset its own state. */
export function requestStop() {
  stopSpeaking();
  stopListening();
  window.dispatchEvent(new Event(STOP_EVENT));
}

/** Escape stops ClearForm talking or listening from anywhere in the app. */
export function GlobalStop() {
  const announce = useAnnounce();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      requestStop();
      announce("Stopped");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [announce]);
  return null;
}
