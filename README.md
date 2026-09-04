# ClearForm

Voice-first accessibility platform that helps blind and low-vision users understand and complete complex documents safely.

**Hear → Speak → Confirm → Complete → Download**

## Run locally

```bash
npm install
npm run dev
```

Add your keys to `.env.local` (see `.env.example`):

```
ELEVENLABS_API_KEY=...   # spoken questions, read-back, Scribe speech-to-text
LINKUP_API_KEY=...       # trusted explanations + official form matching
```

Without keys the app falls back to the browser speech engine and a built-in glossary.

## Deploy to Vercel

1. Push this folder to a Git repo and import it in Vercel (framework: Next.js — auto-detected).
2. Project → Settings → Environment Variables: add `ELEVENLABS_API_KEY` and `LINKUP_API_KEY`.
3. Deploy.

## Safety rules baked in

- Every spoken value is transcribed → read back → confirmed before a field is filled.
- Low-confidence values are never guessed; they are marked **Needs review**.
- Signature fields are never completed.
- Linkup is only used for terminology / official form guidance, never for personal values.
- Documents are processed in memory for the session only; nothing is stored.
