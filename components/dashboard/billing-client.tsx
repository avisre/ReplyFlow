"use client";

import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { UpgradeModal } from "@/components/ui/upgrade-modal";

type BillingUser = {
  name: string;
  subscriptionStatus: "active" | "inactive" | "trialing";
  trialEndsAt: string | null;
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function BillingClient({
  user,
  showUpgradeModal,
}: {
  user: BillingUser;
  showUpgradeModal: boolean;
}) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const startCheckout = async () => {
    try {
      setCheckoutLoading(true);
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      window.location.href = data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const openPortal = async () => {
    try {
      setPortalLoading(true);
      const response = await fetch("/api/billing/portal", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to open billing portal");
      }

      window.location.href = data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open portal");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your ReplyFlow subscription and invoices.
            </p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
              user.subscriptionStatus === "active"
                ? "bg-emerald-100 text-emerald-700"
                : user.subscriptionStatus === "trialing"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            {user.subscriptionStatus.toUpperCase()}
          </span>
        </div>

        <div className="mt-8 rounded-2xl border border-gray-100 bg-gray-50 p-6">
          <p className="text-sm text-gray-500">Current Plan</p>
          <h2 className="mt-1 text-2xl font-bold text-gray-900">ReplyFlow Pro - $29/month</h2>
          <p className="mt-2 text-sm text-gray-600">
            Includes unlimited AI-generated replies, auto-posting, email alerts,
            and full dashboard analytics.
          </p>

          {user.trialEndsAt ? (
            <p className="mt-3 text-xs text-gray-500">
              Trial ends on {formatDate(user.trialEndsAt)}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startCheckout}
              disabled={checkoutLoading}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-indigo-700 disabled:opacity-70"
            >
              {checkoutLoading ? <LoadingSpinner /> : null}
              {checkoutLoading ? "Redirecting..." : "Start Subscription"}
            </button>

            <button
              type="button"
              onClick={openPortal}
              disabled={portalLoading}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-600 px-6 py-3 font-semibold text-indigo-600 transition-all duration-200 hover:bg-indigo-50 disabled:opacity-70"
            >
              {portalLoading ? <LoadingSpinner /> : null}
              {portalLoading ? "Opening..." : "Open Billing Portal"}
            </button>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/dashboard" className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-100">
            Back to Dashboard
          </Link>
        </div>
      </div>

      <UpgradeModal open={showUpgradeModal} />
    </main>
  );
}
