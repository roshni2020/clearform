"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type TextSize = "small" | "default" | "large" | "xl";
export type Theme = "light" | "dark" | "contrast";
export type VoiceSpeed = "slow" | "normal" | "fast";

export interface Settings {
  textSize: TextSize;
  theme: Theme;
  reduceMotion: boolean;
  voiceSpeed: VoiceSpeed;
  voiceGuidance: boolean;
}

const DEFAULTS: Settings = {
  textSize: "default",
  theme: "light",
  reduceMotion: false,
  voiceSpeed: "normal",
  voiceGuidance: true,
};

/** Accessibility preferences only — never document contents. */
const STORAGE_KEY = "clearform.a11y";

interface Ctx {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<Ctx>({ settings: DEFAULTS, update: () => {}, reset: () => {} });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      else if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setSettings((s) => ({ ...s, reduceMotion: true }));
    } catch {
      /* storage unavailable — keep defaults */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.textSize = settings.textSize;
    root.dataset.reduceMotion = settings.reduceMotion ? "true" : "false";
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const update = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const reset = useCallback(() => setSettings(DEFAULTS), []);
  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}

export function speedToRate(speed: VoiceSpeed): number {
  return speed === "slow" ? 0.85 : speed === "fast" ? 1.2 : 1;
}
