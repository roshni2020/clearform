import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

interface ScribeWord {
  text: string;
  type?: string;
  logprob?: number;
}
interface ScribeResponse {
  text?: string;
  language_probability?: number;
  words?: ScribeWord[];
}

/** ElevenLabs Scribe speech-to-text. Returns { text, confidence }. */
export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "ElevenLabs is not configured", fallback: true }, { status: 503 });
  try {
  const incoming = await req.formData();
  const audio = incoming.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: "No audio" }, { status: 400 });

  const form = new FormData();
  form.append("file", audio, "speech.webm");
  form.append("model_id", "scribe_v1");
  form.append("language_code", "eng");
  form.append("tag_audio_events", "false");
  form.append("diarize", "false");

  const upstream = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": key },
    body: form,
  });
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("ElevenLabs STT error", upstream.status, detail.slice(0, 300));
    return NextResponse.json({ error: "Speech-to-text failed" }, { status: 502 });
  }
  const json = (await upstream.json()) as ScribeResponse;
  const text = (json.text || "").trim();

  // Confidence: mean word probability when Scribe provides log-probs; otherwise unknown.
  let confidence: number | undefined;
  const words = (json.words || []).filter((w) => w.type === "word" && typeof w.logprob === "number");
  if (words.length) {
    const mean = words.reduce((acc, w) => acc + Math.exp(w.logprob as number), 0) / words.length;
    confidence = Math.max(0, Math.min(1, mean));
  }
  return NextResponse.json({ text, confidence, language_probability: json.language_probability });
  } catch (err) {
    console.error("STT route crashed", err);
    return NextResponse.json({ error: "Speech-to-text crashed", detail: (err as Error).message }, { status: 500 });
  }
}
