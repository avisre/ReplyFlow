"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  Star,
  X,
} from "lucide-react";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { UpgradeModal } from "@/components/ui/upgrade-modal";

type DashboardUser = {
  name: string;
  email: string;
  subscriptionStatus: "active" | "inactive" | "trialing";
  trialEndsAt: string | null;
};

type Review = {
  _id: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  generatedReply?: string;
  status: "pending" | "generated" | "posted";
  createdAt: string;
  postedAt?: string;
};

type FilterTab = "all" | "awaiting" | "replied";

const avatarColors = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
];

function getAvatarColor(name: string) {
  const sum = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[sum % avatarColors.length];
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DashboardClient({
  user,
  showUpgradeModal,
}: {
  user: DashboardUser;
  showUpgradeModal: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [draftReplies, setDraftReplies] = useState<Record<string, string>>({});
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/reviews", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load reviews");
      }

      const normalized = (data.reviews || []).map((review: Review) => ({
        ...review,
        _id: String(review._id),
      })) as Review[];

      setReviews(normalized);
      const initialDrafts = normalized.reduce((acc, review) => {
        if (review.generatedReply) {
          acc[review._id] = review.generatedReply;
        }
        return acc;
      }, {} as Record<string, string>);
      setDraftReplies(initialDrafts);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredReviews = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return reviews.filter((review) => {
      const matchesTab =
        activeTab === "all"
          ? true
          : activeTab === "awaiting"
            ? review.status === "pending" || review.status === "generated"
            : review.status === "posted";

      const matchesSearch =
        !searchLower ||
        review.reviewerName.toLowerCase().includes(searchLower) ||
        review.reviewText.toLowerCase().includes(searchLower);

      return matchesTab && matchesSearch;
    });
  }, [activeTab, reviews, search]);

  const stats = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const totalThisMonth = reviews.filter((review) => {
      const created = new Date(review.createdAt);
      return created.getMonth() === month && created.getFullYear() === year;
    }).length;

    const awaitingReply = reviews.filter(
      (review) => review.status === "pending" || review.status === "generated",
    ).length;

    const postedThisMonth = reviews.filter((review) => {
      if (review.status !== "posted" || !review.postedAt) {
        return false;
      }
      const posted = new Date(review.postedAt);
      return posted.getMonth() === month && posted.getFullYear() === year;
    }).length;

    const averageStarRating =
      reviews.length > 0
        ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
        : "0.0";

    return {
      totalThisMonth,
      awaitingReply,
      postedThisMonth,
      averageStarRating,
    };
  }, [reviews]);

  const generateReply = async (reviewId: string) => {
    if (showUpgradeModal) {
      toast.error("Upgrade required to generate new replies.");
      return;
    }

    try {
      setGeneratingId(reviewId);
      const response = await fetch("/api/reviews/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate reply");
      }

      const newReply = data.reply as string;
      setDraftReplies((prev) => ({ ...prev, [reviewId]: newReply }));
      setReviews((prev) =>
        prev.map((review) =>
          review._id === reviewId
            ? { ...review, generatedReply: newReply, status: "generated" }
            : review,
        ),
      );
      toast.success("AI reply generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate reply");
    } finally {
      setGeneratingId(null);
    }
  };

  const approveAndPost = async (reviewId: string) => {
    if (showUpgradeModal) {
      toast.error("Upgrade required to post replies.");
      return;
    }

    try {
      setPostingId(reviewId);
      const reply = (draftReplies[reviewId] || "").trim();

      const response = await fetch("/api/reviews/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reviewId, reply }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to post reply");
      }

      setReviews((prev) =>
        prev.map((review) =>
          review._id === reviewId
            ? {
                ...review,
                status: "posted",
                generatedReply: data.reply,
                postedAt: data.postedAt,
              }
            : review,
        ),
      );
      toast.success("Reply posted to Google.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post reply");
    } finally {
      setPostingId(null);
    }
  };

  const sidebarClasses = collapsed ? "w-[84px]" : "w-72";

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      {mobileSidebarOpen ? (
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          aria-label="Close sidebar"
        />
      ) : null}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-40 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-200 md:sticky ${sidebarClasses} ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="rounded-full bg-indigo-100 p-2 text-indigo-600">
              <MessageSquare className="h-4 w-4" />
            </div>
            {!collapsed ? <span className="text-lg font-bold text-indigo-600">ReplyFlow</span> : null}
          </div>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-full p-1 text-gray-500 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700"
              >
                <LayoutDashboard className="h-4 w-4" />
                {!collapsed ? <span>Dashboard</span> : null}
              </button>
            </li>
            <li>
              <a
                href="#reviews-feed"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-700 transition-all duration-200 hover:bg-gray-100"
              >
                <MessageSquare className="h-4 w-4" />
                {!collapsed ? <span>Reviews</span> : null}
              </a>
            </li>
            <li>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-700 transition-all duration-200 hover:bg-gray-100"
              >
                <Settings className="h-4 w-4" />
                {!collapsed ? <span>Settings</span> : null}
              </button>
            </li>
            <li>
              <Link
                href="/billing"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-700 transition-all duration-200 hover:bg-gray-100"
              >
                <CreditCard className="h-4 w-4" />
                {!collapsed ? <span>Billing</span> : null}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="border-t border-gray-100 p-3">
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="mb-3 w-full rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-all duration-200 hover:bg-gray-50"
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>

          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="truncate text-xs text-gray-500">{user.email}</p>
              </div>
            ) : null}
          </div>

          {!collapsed ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="mt-3 w-full rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-100"
            >
              Logout
            </button>
          ) : null}
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8 md:hidden">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700"
            >
              Menu
            </button>
            <Link href="/billing" className="rounded-full border border-indigo-600 px-4 py-2 text-sm font-semibold text-indigo-600">
              Billing
            </Link>
          </div>
        </header>

        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">
                Monitor every review and reply in one place.
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
              Subscription: {user.subscriptionStatus}
            </span>
          </div>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Total Reviews This Month</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalThisMonth}</p>
              <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Positive trend
              </span>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Awaiting Reply</p>
              <p className="mt-2 text-3xl font-bold text-amber-500">{stats.awaitingReply}</p>
              <span className="mt-3 inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                Action needed
              </span>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Replies Posted This Month</p>
              <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.postedThisMonth}</p>
              <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                On track
              </span>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">Average Star Rating</p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-3xl font-bold text-gray-900">{stats.averageStarRating}</p>
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              </div>
              <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                Strong reputation
              </span>
            </div>
          </section>

          <section id="reviews-feed" className="mt-8 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "all", label: "All" },
                  { key: "awaiting", label: "Awaiting Reply" },
                  { key: "replied", label: "Replied" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as FilterTab)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                      activeTab === tab.key
                        ? "bg-indigo-600 text-white"
                        : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search reviews"
                  className="w-full rounded-full border border-gray-200 py-2 pl-9 pr-4 text-sm outline-none transition-all duration-200 focus:border-indigo-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-600">
                <LoadingSpinner className="mr-2" /> Loading reviews...
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="py-16 text-center text-sm text-gray-500">
                No reviews match your current filters.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {filteredReviews.map((review) => {
                  const avatar = review.reviewerName.charAt(0).toUpperCase();
                  const draftReply =
                    draftReplies[review._id] ?? review.generatedReply ?? "";
                  const awaiting =
                    review.status === "pending" || review.status === "generated";

                  return (
                    <article key={review._id} className="rounded-2xl border border-gray-100 p-5 transition-all duration-200 hover:shadow-md">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${getAvatarColor(review.reviewerName)}`}
                          >
                            {avatar}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{review.reviewerName}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <div className="flex text-amber-400">
                                {Array.from({ length: review.rating }).map((_, idx) => (
                                  <Star key={`${review._id}-${idx}`} className="h-4 w-4 fill-current" />
                                ))}
                              </div>
                              <span className="text-xs text-gray-500">{formatDate(review.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            awaiting
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {awaiting ? "Awaiting Reply" : "Replied"}
                        </span>
                      </div>

                      <p className="mt-4 text-sm text-gray-700">{review.reviewText}</p>

                      {review.status === "pending" ? (
                        <div className="mt-4">
                          <button
                            type="button"
                            onClick={() => generateReply(review._id)}
                            disabled={generatingId === review._id}
                            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-indigo-700 disabled:opacity-70"
                          >
                            {generatingId === review._id ? <LoadingSpinner /> : null}
                            {generatingId === review._id ? "Generating..." : "Generate Reply"}
                          </button>
                        </div>
                      ) : null}

                      {review.status === "generated" ? (
                        <div className="mt-4 rounded-xl bg-gray-50 p-4">
                          <textarea
                            value={draftReply}
                            onChange={(event) =>
                              setDraftReplies((prev) => ({
                                ...prev,
                                [review._id]: event.target.value,
                              }))
                            }
                            rows={4}
                            className="w-full resize-none rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-700 outline-none transition-all duration-200 focus:border-indigo-500"
                          />

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => approveAndPost(review._id)}
                              disabled={postingId === review._id}
                              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-700 disabled:opacity-70"
                            >
                              {postingId === review._id ? <LoadingSpinner /> : null}
                              {postingId === review._id ? "Posting..." : "Approve & Post"}
                            </button>

                            <button
                              type="button"
                              onClick={() => generateReply(review._id)}
                              disabled={generatingId === review._id}
                              className="inline-flex items-center gap-2 rounded-full border border-indigo-600 px-6 py-3 text-sm font-semibold text-indigo-600 transition-all duration-200 hover:bg-indigo-50 disabled:opacity-70"
                            >
                              {generatingId === review._id ? <LoadingSpinner /> : null}
                              {generatingId === review._id ? "Regenerating..." : "Regenerate"}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {review.status === "posted" ? (
                        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                          <p className="text-sm text-emerald-800">{review.generatedReply}</p>
                          {review.postedAt ? (
                            <p className="mt-2 text-xs text-emerald-600">
                              Posted on {formatDate(review.postedAt)}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <BarChart3 className="h-5 w-5 text-indigo-600" /> Weekly Snapshot
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                You responded to {stats.postedThisMonth} reviews this month and have
                {stats.awaitingReply} awaiting action.
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <CreditCard className="h-5 w-5 text-indigo-600" /> Billing
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Plan status: {user.subscriptionStatus}. Manage billing and invoices in
                one place.
              </p>
              <Link href="/billing" className="btn-secondary mt-4 inline-flex">
                Open Billing
              </Link>
            </div>
          </section>
        </div>
      </main>

      <UpgradeModal open={showUpgradeModal} />
    </div>
  );
}
