"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";

import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function UpgradeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose?: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const startCheckout = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to start checkout.");
      }

      window.location.href = data.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full p-1 text-gray-500 transition-all duration-200 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <div className="mb-4 inline-flex rounded-full bg-indigo-100 p-3 text-indigo-600">
          <Sparkles className="h-5 w-5" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">Upgrade to Continue</h3>
        <p className="mt-2 text-sm text-gray-600">
          Your 14-day trial has ended. Upgrade to keep generating and posting AI
          replies automatically.
        </p>

        <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
          <p className="font-semibold text-gray-900">ReplyFlow Pro - $29/month</p>
          <p className="mt-1">Unlimited AI replies, posting, alerts, and dashboard.</p>
        </div>

        <button
          type="button"
          onClick={startCheckout}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <LoadingSpinner /> : null}
          {loading ? "Redirecting..." : "Upgrade Now"}
        </button>
      </div>
    </div>
  );
}
