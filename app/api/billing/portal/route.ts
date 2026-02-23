import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    await connectToDatabase();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer found for this account" }, { status: 400 });
    }

    const stripe = getStripeClient();

    const billingSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/billing`,
    });

    return NextResponse.json({ url: billingSession.url });
  } catch (error) {
    console.error("Billing portal route failed:", error);
    return NextResponse.json({ error: "Unable to open billing portal" }, { status: 500 });
  }
}
