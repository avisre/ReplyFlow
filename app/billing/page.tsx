import { BillingClient } from "@/components/dashboard/billing-client";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const trialEndsAt = session.user.trialEndsAt;
  const trialEnded = trialEndsAt ? new Date(trialEndsAt) < new Date() : false;
  const showUpgradeModal =
    session.user.subscriptionStatus === "inactive" && trialEnded;

  return (
    <BillingClient
      user={{
        name: session.user.name ?? "ReplyFlow User",
        subscriptionStatus: session.user.subscriptionStatus,
        trialEndsAt,
      }}
      showUpgradeModal={showUpgradeModal}
    />
  );
}
