"use client";

import LoadingSpinner from "@/components/common/loading-spinner";
import {
  cn,
  formatCompactNumber,
  formatDate,
  getAvatarColor,
  getInitials,
} from "@/lib/utils";
import {
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Star,
  X,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type ReviewItem = {
  _id: string;
  reviewId: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  generatedReply: string;
  status: "pending" | "generated" | "posted";
  postedAt: string | null;
  createdAt: string;
};

type FilterTab = "all" | "awaiting" | "replied";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Reviews", icon: MessageSquare, href: "/dashboard#reviews" },
  { label: "Settings", icon: Settings, href: "/dashboard#settings" },
  { label: "Billing", icon: CreditCard, href: "/billing" },
];

export default function DashboardApp() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [generatingReviewId, setGeneratingReviewId] = useState<string | null>(null);
  const [postingReviewId, setPostingReviewId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");

  const refreshReviews = useCallback(async () => {
    setIsLoadingReviews(true);

    try {
      const response = await fetch("/api/reviews", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as {
        reviews?: ReviewItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to fetch reviews");
      }

      setReviews(data.reviews ?? []);
    } catch (error) {
      console.error(error);
      toast.error("Unable to load reviews.");
    } finally {
      setIsLoadingReviews(false);
    }
  }, []);

  useEffect(() => {
    void refreshReviews();
  }, [refreshReviews]);

  useEffect(() => {
    const checkoutStatus = searchParams.get("checkout");
    if (checkoutStatus === "success") {
      toast.success("Subscription activated successfully.");
    }

    if (checkoutStatus === "cancelled") {
      toast.error("Checkout was cancelled.");
    }
  }, [searchParams]);

  const updateReview = (updatedReview: ReviewItem) => {
    setReviews((currentReviews) =>
      currentReviews.map((review) =>
        review._id === updatedReview._id ? { ...review, ...updatedReview } : review,
      ),
    );
  };

  const handleGenerateReply = async (reviewId: string) => {
    setGeneratingReviewId(reviewId);

    try {
      const response = await fetch("/api/reviews/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewId }),
      });

      const data = (await response.json()) as { review?: ReviewItem; error?: string };
      if (!response.ok || !data.review) {
        throw new Error(data.error ?? "Failed to generate reply");
      }

      updateReview(data.review);
      toast.success("Reply generated.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to generate AI reply.");
    } finally {
      setGeneratingReviewId(null);
    }
  };

  const handleReplyTextChange = (reviewId: string, value: string) => {
    setReviews((currentReviews) =>
      currentReviews.map((review) =>
        review._id === reviewId ? { ...review, generatedReply: value } : review,
      ),
    );
  };

  const handleApproveAndPost = async (reviewId: string) => {
    const targetReview = reviews.find((review) => review._id === reviewId);
    if (!targetReview) {
      return;
    }

    setPostingReviewId(reviewId);

    try {
      const response = await fetch("/api/reviews/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewId,
          replyText: targetReview.generatedReply,
        }),
      });

      const data = (await response.json()) as { review?: ReviewItem; error?: string };
      if (!response.ok || !data.review) {
        throw new Error(data.error ?? "Failed to post reply");
      }

      updateReview(data.review);
      toast.success("Reply approved and posted.");
    } catch (error) {
      console.error(error);
      toast.error("Unable to post this reply.");
    } finally {
      setPostingReviewId(null);
    }
  };

  const handleUpgrade = async () => {
    setIsCheckoutLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Unable to start checkout");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      toast.error("Unable to open checkout.");
      setIsCheckoutLoading(false);
    }
  };

  const trialEnded = session?.user?.trialEndsAt
    ? new Date(session.user.trialEndsAt) < new Date()
    : false;
  const shouldShowUpgradeModal =
    session?.user?.subscriptionStatus === "inactive" && trialEnded;

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const textMatch =
        review.reviewerName.toLowerCase().includes(search.toLowerCase()) ||
        review.reviewText.toLowerCase().includes(search.toLowerCase());

      if (!textMatch) {
        return false;
      }

      if (activeTab === "awaiting") {
        return review.status === "pending" || review.status === "generated";
      }

      if (activeTab === "replied") {
        return review.status === "posted";
      }

      return true;
    });
  }, [reviews, search, activeTab]);

  const stats = useMemo(() => {
    const now = new Date();

    const isCurrentMonth = (value: string | null) => {
      if (!value) {
        return false;
      }

      const date = new Date(value);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    };

    const totalReviewsThisMonth = reviews.filter((review) => isCurrentMonth(review.createdAt)).length;
    const awaitingReply = reviews.filter(
      (review) => review.status === "pending" || review.status === "generated",
    ).length;
    const repliesPostedThisMonth = reviews.filter(
      (review) => review.status === "posted" && isCurrentMonth(review.postedAt),
    ).length;
    const averageStarRating =
      reviews.length > 0
        ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
        : "0.0";

    return {
      totalReviewsThisMonth,
      awaitingReply,
      repliesPostedThisMonth,
      averageStarRating,
    };
  }, [reviews]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]">
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden",
          mobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileSidebarOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-gray-200 bg-white shadow-sm transition-all duration-300",
          isCollapsed ? "w-[92px]" : "w-72",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-20 items-center justify-between border-b border-gray-100 px-4">
          <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
            <span className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
              <MessageCircle className="h-5 w-5" />
            </span>
            {!isCollapsed ? <span className="text-lg font-bold text-indigo-600">ReplyFlow</span> : null}
          </Link>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-2 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-indigo-50 hover:text-indigo-700"
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!isCollapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                getAvatarColor(session?.user?.name ?? "User"),
              )}
            >
              {getInitials(session?.user?.name ?? "User")}
            </div>
            {!isCollapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {session?.user?.name ?? "ReplyFlow User"}
                </p>
                <p className="truncate text-xs text-gray-500">{session?.user?.email ?? ""}</p>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-all duration-200 hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed ? "Logout" : null}
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed((value) => !value)}
              className="hidden rounded-full border border-gray-200 p-2 text-gray-500 transition-all duration-200 hover:bg-gray-100 lg:inline-flex"
            >
              {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </aside>

      <div className={cn("transition-all duration-300", isCollapsed ? "lg:pl-[92px]" : "lg:pl-72")}>
        <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur lg:hidden">
          <div className="flex h-16 items-center justify-between px-5">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-lg border border-gray-200 p-2 text-gray-700"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-gray-800">ReplyFlow Dashboard</span>
            <span />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Monitor every review and respond in seconds with AI.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card-base p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total Reviews This Month
              </p>
              <p className="mt-3 text-3xl font-bold text-gray-900">
                {formatCompactNumber(stats.totalReviewsThisMonth)}
              </p>
            </div>

            <div className="card-base p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Awaiting Reply
              </p>
              <p className="mt-3 text-3xl font-bold text-amber-500">
                {formatCompactNumber(stats.awaitingReply)}
              </p>
            </div>

            <div className="card-base p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Replies Posted This Month
              </p>
              <p className="mt-3 text-3xl font-bold text-emerald-600">
                {formatCompactNumber(stats.repliesPostedThisMonth)}
              </p>
            </div>

            <div className="card-base p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Average Star Rating
              </p>
              <p className="mt-3 flex items-center gap-2 text-3xl font-bold text-gray-900">
                <Star className="h-7 w-7 fill-amber-400 text-amber-400" />
                {stats.averageStarRating}
              </p>
            </div>
          </div>

          <section id="reviews" className="mt-8 card-base p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 p-1">
                {[
                  { key: "all", label: "All" },
                  { key: "awaiting", label: "Awaiting Reply" },
                  { key: "replied", label: "Replied" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as FilterTab)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                      activeTab === tab.key
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-white hover:text-gray-900",
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:max-w-sm">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reviewer name or content"
                  className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition-all duration-200 focus:border-indigo-500"
                />
              </div>
            </div>

            {isLoadingReviews ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-600">
                  <LoadingSpinner className="text-indigo-600" />
                  Loading reviews...
                </div>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-500">No reviews found for this filter.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {filteredReviews.map((review) => {
                  const isGenerating = generatingReviewId === review._id;
                  const isPosting = postingReviewId === review._id;
                  const isAwaiting = review.status === "pending" || review.status === "generated";

                  return (
                    <article key={review._id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                              getAvatarColor(review.reviewerName),
                            )}
                          >
                            {getInitials(review.reviewerName)}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-gray-900">{review.reviewerName}</p>
                              <span className="text-xs text-gray-500">{formatDate(review.createdAt)}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-1 text-amber-500">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={cn(
                                    "h-4 w-4",
                                    star <= review.rating
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-gray-300",
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        <span
                          className={cn(
                            "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                            isAwaiting
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700",
                          )}
                        >
                          {isAwaiting ? "Awaiting Reply" : "Replied"}
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-relaxed text-gray-700">{review.reviewText}</p>

                      {review.status === "pending" ? (
                        <button
                          type="button"
                          onClick={() => handleGenerateReply(review._id)}
                          disabled={isGenerating}
                          className="btn-primary mt-4"
                        >
                          {isGenerating ? (
                            <>
                              <LoadingSpinner />
                              Generating...
                            </>
                          ) : (
                            "Generate Reply"
                          )}
                        </button>
                      ) : null}

                      {review.status === "generated" ? (
                        <div className="mt-4 space-y-3">
                          <textarea
                            value={review.generatedReply}
                            onChange={(event) => handleReplyTextChange(review._id, event.target.value)}
                            rows={4}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm outline-none transition-all duration-200 focus:border-indigo-500"
                          />
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              onClick={() => handleApproveAndPost(review._id)}
                              disabled={isPosting}
                              className="btn-base rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              {isPosting ? (
                                <>
                                  <LoadingSpinner />
                                  Posting...
                                </>
                              ) : (
                                "Approve & Post"
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleGenerateReply(review._id)}
                              disabled={isGenerating}
                              className="btn-secondary"
                            >
                              {isGenerating ? (
                                <>
                                  <LoadingSpinner className="text-indigo-600" />
                                  Regenerating...
                                </>
                              ) : (
                                "Regenerate"
                              )}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {review.status === "posted" ? (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                          <p>{review.generatedReply}</p>
                          <p className="mt-2 text-xs font-medium text-emerald-700">
                            Posted {review.postedAt ? formatDate(review.postedAt) : "just now"}
                          </p>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section id="settings" className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Settings Snapshot</h2>
            <p className="mt-2 text-sm text-gray-600">
              Account status: <span className="font-semibold">{session?.user?.subscriptionStatus}</span>
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Trial ends:{" "}
              <span className="font-semibold">
                {session?.user?.trialEndsAt ? formatDate(session.user.trialEndsAt) : "Not set"}
              </span>
            </p>
          </section>
        </main>
      </div>

      {shouldShowUpgradeModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-5">
          <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
            <h3 className="text-2xl font-bold text-gray-900">Your trial has ended</h3>
            <p className="mt-3 text-sm text-gray-600">
              Upgrade to continue generating and posting AI replies. Unlock the full ReplyFlow
              experience for just $29/month.
            </p>
            <button
              type="button"
              onClick={handleUpgrade}
              disabled={isCheckoutLoading}
              className="btn-primary mt-6 w-full justify-center"
            >
              {isCheckoutLoading ? (
                <>
                  <LoadingSpinner />
                  Opening checkout...
                </>
              ) : (
                "Upgrade to Pro"
              )}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
