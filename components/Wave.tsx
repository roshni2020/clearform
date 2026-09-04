import type { AssistantState } from "@/lib/types";

export const STATE_LABEL: Record<AssistantState, string> = {
  ready: "Ready",
  speaking: "Speaking",
  listening: "Listening",
  transcribing: "Transcribing",
  "awaiting-confirmation": "Waiting for confirmation",
  confirmed: "Confirmed",
  "needs-review": "Needs review",
  complete: "Complete",
};

export function Wave({ state, level = 0 }: { state: AssistantState; level?: number }) {
  const bars = Array.from({ length: 9 });
  return (
    <div className="wave" data-state={state} aria-hidden="true">
      {bars.map((_, i) => (
        <span
          key={i}
          style={
            state === "listening" && level > 0
              ? { height: `${10 + level * 40 * (0.6 + Math.abs(Math.sin(i + 1)) * 0.4)}px`, animation: "none" }
              : undefined
          }
        />
      ))}
    </div>
  );
}

export function StatePill({ state }: { state: AssistantState }) {
  return (
    <span className="state-pill" data-state={state}>
      <span className="dot" aria-hidden="true" />
      {STATE_LABEL[state]}
    </span>
  );
}
