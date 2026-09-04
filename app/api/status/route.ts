import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Tells the client which integrations are configured so it can pick the right engine up front. */
export async function GET() {
  return NextResponse.json({
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
    linkup: Boolean(process.env.LINKUP_API_KEY),
  });
}
