import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-helpers";
import { processDripEmails } from "@/lib/drip-emails";

/**
 * POST /api/drip-emails
 *
 * Lightweight check-and-send for onboarding drip emails.
 * Called on dashboard load. Sends at most 1 email per call.
 */
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ sent: 0 });
    }

    const sent = await processDripEmails(user.id);
    return NextResponse.json({ sent });
  } catch {
    // Never block the user experience for drip emails
    return NextResponse.json({ sent: 0 });
  }
}
