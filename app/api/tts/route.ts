import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

// "Sarah" — a warm, calm, clear voice from the ElevenLabs default library.
const DEFAULT_VOICE = "EXAVITQu4vr4xnSDxMaL";

/** Diagnostic: GET /api/tts reports whether ElevenLabs accepts the configured key (never returns the key). */
export async function GET() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return NextResponse.json({ configured: false });
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/user/subscription", { headers: { "xi-api-key": key.trim() } });
    const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    return NextResponse.json({
      configured: true,
      keyLength: key.length,
      keyTrimmedLength: key.trim().length,
      upstreamStatus: r.status,
      tier: body.tier,
      characterCount: body.character_count,
      characterLimit: body.character_limit,
      detail: r.ok ? undefined : body.detail,
    });
  } catch (err) {
    return NextResponse.json({ configured: true, error: (err as Error).message }, { status: 500 });
  }
}

/** ElevenLabs text-to-speech. Returns audio/mpeg. */
export async function POST(req: Request) {
  try {
    const key = process.env.ELEVENLABS_API_KEY?.trim();
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
      console.error("ElevenLabs TTS error", upstream.status, detail.slice(0, 500));
      return NextResponse.json({ error: "Text-to-speech failed", upstreamStatus: upstream.status, detail: detail.slice(0, 300), fallback: true }, { status: 502 });
    }
    const audio = await upstream.arrayBuffer();
    return new Response(audio, {
      headers: { "Content-Type": "audio/mpeg", "Content-Length": String(audio.byteLength), "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("TTS route crashed", err);
    return NextResponse.json({ error: "Text-to-speech crashed", detail: (err as Error).message, fallback: true }, { status: 500 });
  }
}
