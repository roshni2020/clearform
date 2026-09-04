import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// "Sarah" — a warm, calm, clear voice from the ElevenLabs default library.
const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL";

/** ElevenLabs text-to-speech. Returns audio/mpeg. */
export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return NextResponse.json({ error: "ElevenLabs is not configured", fallback: true }, { status: 503 });

  let body: { text?: string; rate?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const text = (body.text || "").toString().slice(0, 4000);
  if (!text.trim()) return NextResponse.json({ error: "No text" }, { status: 400 });
  const speed = Math.min(1.2, Math.max(0.7, Number(body.rate) || 1));

  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;
  const modelId = process.env.ELEVENLABS_TTS_MODEL || "eleven_turbo_v2_5";

  const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: { stability: 0.6, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true, speed },
    }),
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("ElevenLabs TTS error", upstream.status, detail.slice(0, 300));
    return NextResponse.json({ error: "Text-to-speech failed", fallback: true }, { status: 502 });
  }
  return new Response(upstream.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
