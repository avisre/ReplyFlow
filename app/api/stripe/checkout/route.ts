import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.STRIPE_PRICE_ID) {
      return NextResponse.json({ error: "STRIPE_PRICE_ID is missing" }, { status: 500 });
    }

    const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    await connectToDatabase();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stripe = getStripeClient();

    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString(),
        },
      });

      user.stripeCustomerId = customer.id;
      await user.save();
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: user.stripeCustomerId,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      payment_method_collection: "if_required",
      subscription_data: {
        trial_period_days: 14,
      },
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/dashboard?checkout=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe checkout creation failed:", error);
    return NextResponse.json({ error: "Unable to create checkout session" }, { status: 500 });
  }
}
