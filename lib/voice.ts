"use client";

/**
 * Voice engine.
 *
 * Text-to-speech and speech-to-text go through ElevenLabs via the server routes
 * (/api/tts and /api/stt). When ElevenLabs is not configured the engine falls back
 * to the browser's Web Speech API so the experience still works end-to-end.
 */

export interface VoiceStatus {
  elevenlabs: boolean;
  linkup: boolean;
}

let statusCache: VoiceStatus | null = null;
export async function getVoiceStatus(): Promise<VoiceStatus> {
  if (statusCache) return statusCache;
  try {
    const r = await fetch("/api/status", { cache: "no-store" });
    statusCache = (await r.json()) as VoiceStatus;
  } catch {
    statusCache = { elevenlabs: false, linkup: false };
  }
  return statusCache;
}

/* ------------------------------------------------------------------ */
/* Speaking                                                            */
/* ------------------------------------------------------------------ */

let currentAudio: HTMLAudioElement | null = null;
let currentAbort: AbortController | null = null;
let speakToken = 0;

export interface SpeakOptions {
  rate?: number; // 0.85 slow, 1 normal, 1.2 fast
  enabled?: boolean; // voice guidance toggle
}

/** Stop anything currently being spoken. */
export function stopSpeaking() {
  speakToken++;
  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/** Speak text aloud. Resolves when finished (or immediately when disabled/cancelled). */
export async function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  if (opts.enabled === false || !text.trim()) return;
  stopSpeaking();
  const token = ++speakToken;
  const rate = opts.rate ?? 1;

  const status = await getVoiceStatus();
  if (token !== speakToken) return;

  if (status.elevenlabs) {
    try {
      const abort = new AbortController();
      currentAbort = abort;
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, rate }),
        signal: abort.signal,
      });
      if (token !== speakToken) return;
      if (res.ok) {
        const blob = await res.blob();
        if (token !== speakToken) return;
        await playBlob(blob, token);
        return;
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      // fall through to browser synthesis
    }
  }
  if (token !== speakToken) return;
  await browserSpeak(text, rate, token);
}

function playBlob(blob: Blob, token: number): Promise<void> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    const done = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    audio.onended = done;
    audio.onerror = done;
    audio.play().catch(done);
    // Safety: if cancelled elsewhere
    const check = setInterval(() => {
      if (token !== speakToken) {
        clearInterval(check);
        done();
      }
      if (audio.ended || audio.paused && audio.currentTime === 0 && currentAudio !== audio) clearInterval(check);
    }, 200);
  });
}

function browserSpeak(text: string, rate: number, token: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => /Samantha|Google US English|Microsoft Aria|Microsoft Jenny|Karen|Moira/i.test(v.name)) ||
      voices.find((v) => v.lang.startsWith("en"));
    if (preferred) utter.voice = preferred;
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    window.speechSynthesis.speak(utter);
    const check = setInterval(() => {
      if (token !== speakToken) {
        clearInterval(check);
        resolve();
      }
      if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) clearInterval(check);
    }, 200);
  });
}

/* ------------------------------------------------------------------ */
/* Listening                                                           */
/* ------------------------------------------------------------------ */

export interface ListenResult {
  transcript: string;
  confidence?: number;
  provider: "elevenlabs" | "browser";
}

export interface ListenOptions {
  /** Called with live interim text (browser engine only) or audio level updates. */
  onInterim?: (text: string) => void;
  onLevel?: (level: number) => void;
  maxMs?: number;
  silenceMs?: number;
}

let activeStop: (() => void) | null = null;

export function stopListening() {
  if (activeStop) {
    activeStop();
    activeStop = null;
  }
}

/** Listen once and return a transcript. Rejects with an Error the caller can show. */
export async function listen(opts: ListenOptions = {}): Promise<ListenResult> {
  stopSpeaking();
  const status = await getVoiceStatus();
  if (status.elevenlabs && typeof MediaRecorder !== "undefined") {
    return recordAndTranscribe(opts);
  }
  return browserListen(opts);
}

async function recordAndTranscribe(opts: ListenOptions): Promise<ListenResult> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  // Silence detection so the user does not need to press stop.
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const data = new Uint8Array(analyser.fftSize);
  let heardSpeech = false;
  let lastSound = performance.now();
  const started = performance.now();
  const maxMs = opts.maxMs ?? 15000;
  const silenceMs = opts.silenceMs ?? 1400;

  const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));
  const cleanup = () => {
    clearInterval(meter);
    stream.getTracks().forEach((t) => t.stop());
    ctx.close().catch(() => {});
    if (activeStop === stopFn) activeStop = null;
  };
  const stopFn = () => {
    if (recorder.state !== "inactive") recorder.stop();
  };
  activeStop = stopFn;

  const meter = setInterval(() => {
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);
    opts.onLevel?.(Math.min(1, rms * 6));
    const now = performance.now();
    if (rms > 0.02) {
      heardSpeech = true;
      lastSound = now;
    }
    if ((heardSpeech && now - lastSound > silenceMs) || now - started > maxMs) stopFn();
  }, 80);

  recorder.start(250);
  await stopped;
  cleanup();

  const blob = new Blob(chunks, { type: mime || "audio/webm" });
  if (!heardSpeech || blob.size < 1200) {
    return { transcript: "", confidence: 0, provider: "elevenlabs" };
  }
  const form = new FormData();
  form.append("audio", blob, "speech.webm");
  const res = await fetch("/api/stt", { method: "POST", body: form });
  if (!res.ok) throw new Error("Speech recognition failed. Please try again.");
  const json = (await res.json()) as { text: string; confidence?: number };
  return { transcript: json.text || "", confidence: json.confidence, provider: "elevenlabs" };
}

type SRConstructor = new () => SpeechRecognitionLike;
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }>;
}

function getRecognizer(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function browserListeningSupported(): boolean {
  return !!getRecognizer();
}

function browserListen(opts: ListenOptions): Promise<ListenResult> {
  return new Promise((resolve, reject) => {
    const SR = getRecognizer();
    if (!SR) {
      reject(new Error("Voice input is not available in this browser. Please type your answer instead."));
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    let finalText = "";
    let confidence: number | undefined;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (activeStop === stopFn) activeStop = null;
      resolve({ transcript: finalText.trim(), confidence, provider: "browser" });
    };
    const stopFn = () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    };
    activeStop = stopFn;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          finalText += r[0].transcript;
          confidence = r[0].confidence;
        } else interim += r[0].transcript;
      }
      opts.onInterim?.(finalText + interim);
      opts.onLevel?.(0.6);
    };
    rec.onerror = (e) => {
      if (settled) return;
      settled = true;
      if (activeStop === stopFn) activeStop = null;
      if (e.error === "no-speech" || e.error === "aborted") resolve({ transcript: "", confidence: 0, provider: "browser" });
      else if (e.error === "not-allowed") reject(new Error("Microphone access was blocked. Please allow the microphone and try again."));
      else reject(new Error("Speech recognition had a problem. Please try again."));
    };
    rec.onend = finish;
    try {
      rec.start();
    } catch {
      reject(new Error("Could not start listening. Please try again."));
    }
    setTimeout(stopFn, opts.maxMs ?? 15000);
  });
}
