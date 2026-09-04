import { NextResponse } from "next/server";
import { elevenLabsKey, linkupKey } from "@/lib/keys";

export const dynamic = "force-dynamic";

/** Tells the client which integrations are configured so it can pick the right engine up front. */
export async function GET() {
  return NextResponse.json({
    elevenlabs: Boolean(elevenLabsKey()),
    linkup: Boolean(linkupKey()),
  });
}
