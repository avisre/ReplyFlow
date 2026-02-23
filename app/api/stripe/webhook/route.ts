import { connectToDatabase } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import User from "@/models/User";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

const mapSubscriptionStatus = (
  status: Stripe.Subscription.Status,
): "active" | "inactive" | "trialing" => {
  if (status === "active") {
    return "active";
  }

  if (status === "trialing") {
    return "trialing";
  }

  return "inactive";
};

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Missing Stripe signature or webhook secret.", { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  try {
    await connectToDatabase();

    if (event.type === "checkout.session.completed") {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      const customerId =
        typeof checkoutSession.customer === "string"
          ? checkoutSession.customer
          : checkoutSession.customer?.id;

      if (customerId) {
        let nextStatus: "active" | "inactive" | "trialing" = "active";
        let trialEndsAt: Date | null = null;

        if (typeof checkoutSession.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(checkoutSession.subscription);
          nextStatus = mapSubscriptionStatus(subscription.status);
          trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
        }

        await User.findOneAndUpdate(
          { stripeCustomerId: customerId },
          {
            subscriptionStatus: nextStatus,
            trialEndsAt,
          },
          { new: true },
        );
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId =
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer.id;

      await User.findOneAndUpdate(
        { stripeCustomerId: customerId },
        {
          subscriptionStatus: mapSubscriptionStatus(subscription.status),
          trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        },
      );
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error("Stripe webhook handler failed:", error);
    return new Response("Webhook handler failed", { status: 500 });
  }
}
