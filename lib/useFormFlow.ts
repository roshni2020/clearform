"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AssistantState, FieldAnswer, FormDocument, FormField } from "./types";
import { SIGNATURE_MESSAGE } from "./sampleForm";
import { checkTranscript, parseYesNo, tidyValue, AMBIGUOUS_MESSAGE } from "./confidence";
import { listen, speak, stopListening, stopSpeaking } from "./voice";
import { speedToRate, useSettings } from "./settings";
import { useAnnounce } from "@/components/Announcer";

export interface FlowState {
  doc: FormDocument | null;
  index: number;
  answers: Record<string, FieldAnswer>;
  state: AssistantState;
  started: boolean;
  message: string; // what ClearForm most recently said
  transcript: string; // what the user said (final)
  interim: string; // live partial transcript
  pending: string | null; // value awaiting confirmation
  error: string | null;
  level: number; // mic level 0–1
}

const initial: FlowState = {
  doc: null,
  index: 0,
  answers: {},
  state: "ready",
  started: false,
  message: "",
  transcript: "",
  interim: "",
  pending: null,
  error: null,
  level: 0,
};

export function useFormFlow() {
  const { settings } = useSettings();
  const announce = useAnnounce();
  const [s, setS] = useState<FlowState>(initial);
  const run = useRef(0);
  const stateRef = useRef(s);
  stateRef.current = s;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const patch = useCallback((p: Partial<FlowState> | ((prev: FlowState) => Partial<FlowState>)) => {
    setS((prev) => ({ ...prev, ...(typeof p === "function" ? p(prev) : p) }));
  }, []);

  const say = useCallback(
    async (text: string, runId: number, opts?: { keepState?: boolean }) => {
      if (runId !== run.current) return;
      patch({ message: text, ...(opts?.keepState ? {} : { state: "speaking" }) });
      announce(text);
      await speak(text, { rate: speedToRate(settingsRef.current.voiceSpeed), enabled: settingsRef.current.voiceGuidance });
    },
    [announce, patch],
  );

  const cancel = useCallback(() => {
    run.current++;
    stopSpeaking();
    stopListening();
  }, []);

  useEffect(() => () => cancel(), [cancel]);

  const fields = s.doc?.fields ?? [];
  const infoFields = useMemo(() => fields.filter((f) => f.kind !== "signature"), [fields]);
  const current: FormField | undefined = fields[s.index];
  const questionNumber = current ? infoFields.indexOf(current) + 1 : 0;

  /* ---------------------------------------------------------------- */

  const loadDocument = useCallback(
    async (doc: FormDocument) => {
      cancel();
      const id = ++run.current;
      setS({ ...initial, doc });
      await say(doc.intro, id);
      if (id === run.current) patch({ state: "ready" });
    },
    [cancel, patch, say],
  );

  const finish = useCallback(
    async (runId: number) => {
      const st = stateRef.current;
      const confirmed = Object.values(st.answers).filter((a) => a.status === "confirmed").length;
      const review = Object.values(st.answers).filter((a) => a.status === "needs-review" || a.status === "unreadable").length;
      const hasSig = st.doc?.fields.some((f) => f.kind === "signature");
      patch({ state: "complete", pending: null, transcript: "", interim: "" });
      const text = `Your form is ready. ${confirmed} field${confirmed === 1 ? "" : "s"} confirmed, ${review} marked for review${hasSig ? ", and the signature is left blank for you" : ""}. Zero values were guessed. You can download the completed PDF or review your answers.`;
      await say(text, runId, { keepState: true });
    },
    [patch, say],
  );

  const askField = useCallback(
    async (idx: number, runId: number, prefix = "") => {
      const doc = stateRef.current.doc;
      if (!doc) return;
      if (idx >= doc.fields.length) return finish(runId);
      const field = doc.fields[idx];
      patch({ index: idx, transcript: "", interim: "", pending: null, error: null });

      if (field.kind === "signature") {
        patch((p) => ({ answers: { ...p.answers, [field.id]: { value: "", status: "signature" } }, state: "needs-review" }));
        await say(SIGNATURE_MESSAGE, runId);
        if (runId !== run.current) return;
        return askField(idx + 1, runId);
      }

      patch((p) => ({ answers: { ...p.answers, [field.id]: p.answers[field.id] ?? { value: "", status: "active" } } }));
      await say(prefix + field.question, runId);
      if (runId !== run.current) return;
      if (settingsRef.current.voiceGuidance) await listenForAnswer(field, runId, 0);
      else patch({ state: "ready" });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [finish, patch, say],
  );

  const readBack = useCallback(
    async (field: FormField, value: string, runId: number) => {
      patch({ pending: value, transcript: value, interim: "" });
      await say(`I heard ${value}. Is that correct?`, runId);
      if (runId !== run.current) return;
      patch({ state: "awaiting-confirmation" });
      announce("Waiting for confirmation. Say yes or no, or use the buttons.");
      if (settingsRef.current.voiceGuidance) await listenForConfirmation(field, value, runId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [announce, patch, say],
  );

  const listenForAnswer = useCallback(
    async (field: FormField, runId: number, attempt: number) => {
      if (runId !== run.current) return;
      patch({ state: "listening", interim: "", error: null });
      announce("Listening");
      let result;
      try {
        result = await listen({
          onInterim: (t) => runId === run.current && patch({ interim: t }),
          onLevel: (l) => runId === run.current && patch({ level: l }),
        });
      } catch (err) {
        if (runId !== run.current) return;
        patch({ state: "ready", error: (err as Error).message, level: 0 });
        announce((err as Error).message, { assertive: true });
        return;
      }
      if (runId !== run.current) return;
      patch({ state: "transcribing", level: 0, interim: result.transcript });

      const check = checkTranscript(field, result.transcript, result.confidence);
      if (!check.ok) {
        patch({ transcript: result.transcript, state: "needs-review" });
        announce(check.reason ?? AMBIGUOUS_MESSAGE, { assertive: true });
        await say(check.reason ?? AMBIGUOUS_MESSAGE, runId, { keepState: true });
        if (runId !== run.current) return;
        if (attempt < 1) return listenForAnswer(field, runId, attempt + 1);
        patch({ state: "ready" });
        return;
      }
      await readBack(field, tidyValue(field, result.transcript), runId);
    },
    [announce, patch, readBack, say],
  );

  const confirmPending = useCallback(
    async (runId?: number) => {
      const st = stateRef.current;
      const field = st.doc?.fields[st.index];
      if (!field || st.pending == null) return;
      const id = runId ?? (cancel(), ++run.current);
      const value = st.pending;
      patch((p) => ({
        answers: { ...p.answers, [field.id]: { value, status: "confirmed" } },
        state: "confirmed",
        pending: null,
      }));
      announce(`${field.label} confirmed: ${value}`, { toast: true });
      await say("Confirmed.", id, { keepState: true });
      if (id !== run.current) return;
      await askField(st.index + 1, id);
    },
    [announce, askField, cancel, patch, say],
  );

  const retryPending = useCallback(
    async (runId?: number) => {
      const st = stateRef.current;
      const field = st.doc?.fields[st.index];
      if (!field) return;
      const id = runId ?? (cancel(), ++run.current);
      patch({ pending: null, transcript: "", interim: "" });
      await say(`Okay, let's try again. ${field.question}`, id);
      if (id !== run.current) return;
      if (settingsRef.current.voiceGuidance) await listenForAnswer(field, id, 0);
      else patch({ state: "ready" });
    },
    [cancel, listenForAnswer, patch, say],
  );

  const listenForConfirmation = useCallback(
    async (field: FormField, value: string, runId: number) => {
      if (runId !== run.current) return;
      patch({ state: "listening", interim: "" });
      announce("Listening for yes or no");
      let result;
      try {
        result = await listen({
          onInterim: (t) => runId === run.current && patch({ interim: t }),
          onLevel: (l) => runId === run.current && patch({ level: l }),
          maxMs: 8000,
        });
      } catch {
        if (runId === run.current) patch({ state: "awaiting-confirmation", level: 0 });
        return;
      }
      if (runId !== run.current) return;
      patch({ level: 0, interim: result.transcript, transcript: value });
      const yn = parseYesNo(result.transcript);
      if (yn === "yes") return confirmPending(runId);
      if (yn === "no") return retryPending(runId);
      patch({ state: "awaiting-confirmation" });
      await say("Please say yes or no, or choose one of the buttons.", runId, { keepState: true });
    },
    [announce, confirmPending, patch, retryPending, say],
  );

  /* ---------------------------------------------------------------- */
  /* Public actions                                                   */
  /* ---------------------------------------------------------------- */

  const start = useCallback(async () => {
    if (!stateRef.current.doc) return;
    cancel();
    const id = ++run.current;
    patch({ started: true });
    const firstIdx = 0;
    await askField(firstIdx, id, "Great, let's begin. ");
  }, [askField, cancel, patch]);

  const pressMic = useCallback(async () => {
    const st = stateRef.current;
    const field = st.doc?.fields[st.index];
    if (!field || field.kind === "signature") return;
    if (st.state === "listening") {
      stopListening();
      return;
    }
    cancel();
    const id = ++run.current;
    if (st.state === "awaiting-confirmation" && st.pending) await listenForConfirmation(field, st.pending, id);
    else await listenForAnswer(field, id, 0);
  }, [cancel, listenForAnswer, listenForConfirmation]);

  const submitTyped = useCallback(
    async (text: string) => {
      const st = stateRef.current;
      const field = st.doc?.fields[st.index];
      if (!field || field.kind === "signature") return;
      cancel();
      const id = ++run.current;
      const check = checkTranscript(field, text, 1);
      if (!check.ok) {
        patch({ error: check.reason ?? AMBIGUOUS_MESSAGE, state: "ready" });
        announce(check.reason ?? AMBIGUOUS_MESSAGE, { assertive: true });
        return;
      }
      await readBack(field, tidyValue(field, text), id);
    },
    [announce, cancel, patch, readBack],
  );

  const markForReview = useCallback(async () => {
    const st = stateRef.current;
    const field = st.doc?.fields[st.index];
    if (!field || field.kind === "signature") return;
    cancel();
    const id = ++run.current;
    patch((p) => ({ answers: { ...p.answers, [field.id]: { value: "", status: "needs-review" } }, pending: null, state: "needs-review" }));
    announce(`${field.label} marked for review`, { toast: true });
    await say(`I've marked ${field.label} for review and left it blank. Nothing was guessed.`, id, { keepState: true });
    if (id !== run.current) return;
    await askField(st.index + 1, id);
  }, [announce, askField, cancel, patch, say]);

  const repeatQuestion = useCallback(async () => {
    const st = stateRef.current;
    const field = st.doc?.fields[st.index];
    if (!field) return;
    cancel();
    const id = ++run.current;
    if (st.state === "awaiting-confirmation" && st.pending) return readBack(field, st.pending, id);
    await say(field.question, id);
    if (id === run.current) patch({ state: "ready" });
  }, [cancel, patch, readBack, say]);

  const explainField = useCallback(async () => {
    const st = stateRef.current;
    const field = st.doc?.fields[st.index];
    if (!field) return;
    cancel();
    const id = ++run.current;
    const text = field.help ? `${field.label}. ${field.help}` : `I can explain what ${field.label} means, but I don't have extra guidance for this field.`;
    await say(text, id);
    if (id === run.current) patch({ state: st.pending ? "awaiting-confirmation" : "ready" });
  }, [cancel, patch, say]);

  const goTo = useCallback(
    async (idx: number) => {
      cancel();
      const id = ++run.current;
      patch({ started: true });
      await askField(idx, id);
    },
    [askField, cancel, patch],
  );

  const reset = useCallback(() => {
    cancel();
    setS(initial);
  }, [cancel]);

  const stopAll = useCallback(() => {
    cancel();
    patch({ state: stateRef.current.pending ? "awaiting-confirmation" : "ready", level: 0 });
    announce("Stopped");
  }, [announce, cancel, patch]);

  const stats = useMemo(() => {
    const vals = Object.values(s.answers);
    return {
      confirmed: vals.filter((a) => a.status === "confirmed").length,
      review: vals.filter((a) => a.status === "needs-review" || a.status === "unreadable").length,
      total: infoFields.length,
      signature: fields.some((f) => f.kind === "signature"),
    };
  }, [s.answers, infoFields.length, fields]);

  return {
    ...s,
    current,
    questionNumber,
    totalQuestions: infoFields.length,
    stats,
    loadDocument,
    start,
    pressMic,
    submitTyped,
    confirmPending: () => confirmPending(),
    retryPending: () => retryPending(),
    markForReview,
    repeatQuestion,
    explainField,
    goTo,
    stopAll,
    reset,
    speakText: async (text: string) => {
      cancel();
      const id = ++run.current;
      await say(text, id, { keepState: true });
    },
  };
}
