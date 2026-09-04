"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useSettings, type TextSize, type Theme, type VoiceSpeed } from "@/lib/settings";
import { useAnnounce } from "./Announcer";
import { AccessibilityIcon, CloseIcon } from "./Icons";

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="a11y-group" role="group" aria-labelledby={id}>
      <span className="a11y-label" id={id}>
        {label}
      </span>
      <div className="seg">
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Switch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="switch-row a11y-group">
      <span className="a11y-label" id={id} style={{ marginBottom: 0 }}>
        {label}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <span className="switch-state" aria-hidden="true">
          {checked ? "On" : "Off"}
        </span>
        <button type="button" role="switch" aria-checked={checked} aria-labelledby={id} className="switch" onClick={() => onChange(!checked)} />
      </span>
    </div>
  );
}

export function AccessibilityMenu() {
  const { settings, update, reset } = useSettings();
  const announce = useAnnounce();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const set = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K], label: string) => {
    update({ [key]: value } as Partial<typeof settings>);
    announce(label);
  };

  return (
    <div className="a11y-wrap" ref={wrap}>
      <button
        ref={btn}
        type="button"
        className="btn btn-secondary"
        aria-expanded={open}
        aria-controls="a11y-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <AccessibilityIcon className="icon" />
        <span>Accessibility</span>
      </button>
      {open && (
        <div className="a11y-panel" id="a11y-panel" role="dialog" aria-label="Accessibility settings">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Accessibility</h2>
            <button type="button" className="btn btn-icon btn-ghost" aria-label="Close accessibility settings" onClick={() => { setOpen(false); btn.current?.focus(); }}>
              <CloseIcon className="icon" />
            </button>
          </div>
          <div style={{ height: "0.75rem" }} />
          <Segmented<TextSize>
            label="Text size"
            value={settings.textSize}
            options={[
              { value: "small", label: "Small" },
              { value: "default", label: "Default" },
              { value: "large", label: "Large" },
              { value: "xl", label: "Extra Large" },
            ]}
            onChange={(v) => set("textSize", v, `Text size ${v === "xl" ? "extra large" : v}`)}
          />
          <Segmented<Theme>
            label="Theme"
            value={settings.theme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "contrast", label: "High Contrast" },
            ]}
            onChange={(v) => set("theme", v, `${v === "contrast" ? "High contrast" : v === "dark" ? "Dark" : "Light"} theme on`)}
          />
          <Segmented<VoiceSpeed>
            label="Voice speed"
            value={settings.voiceSpeed}
            options={[
              { value: "slow", label: "Slow" },
              { value: "normal", label: "Normal" },
              { value: "fast", label: "Fast" },
            ]}
            onChange={(v) => set("voiceSpeed", v, `Voice speed ${v}`)}
          />
          <Switch label="Voice guidance" checked={settings.voiceGuidance} onChange={(v) => set("voiceGuidance", v, v ? "Voice guidance on" : "Voice guidance off")} />
          <Switch label="Reduce motion" checked={settings.reduceMotion} onChange={(v) => set("reduceMotion", v, v ? "Reduced motion on" : "Reduced motion off")} />
          <button type="button" className="btn btn-ghost" onClick={() => { reset(); announce("Accessibility settings reset"); }}>
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}
