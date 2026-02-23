"use client";

import LoadingSpinner from "@/components/common/loading-spinner";
import { CreditCard, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

export default function BillingPanel() {
  const [isLoading, setIsLoading] = useState(false);

  const handleManageBilling = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/billing/portal", {
        method: "GET",
      });

      const data = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Unable to open billing portal");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      toast.error("Unable to open billing portal.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] px-5 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/dashboard" className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
            <MessageCircle className="h-5 w-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Billing</h1>
        </div>

        <div className="card-base p-8">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-indigo-100 p-2 text-indigo-600">
              <CreditCard className="h-5 w-5" />
            </span>
            <h2 className="text-xl font-semibold text-gray-900">Manage Subscription</h2>
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Open Stripe Billing Portal to update payment methods, view invoices, or cancel your
            subscription.
          </p>

          <button
            type="button"
            onClick={handleManageBilling}
            disabled={isLoading}
            className="btn-primary mt-6"
          >
            {isLoading ? (
              <>
                <LoadingSpinner />
                Opening portal...
              </>
            ) : (
              "Open Billing Portal"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
