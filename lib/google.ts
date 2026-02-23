export type ExternalReview = {
  reviewId: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  createdAt: Date;
};

type GoogleReview = {
  name?: string;
  reviewId?: string;
  starRating?: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime?: string;
  reviewer?: {
    displayName?: string;
  };
  reviewReply?: {
    comment?: string;
  };
};

const ratingMap: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

const googleHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
});

const demoReviews: ExternalReview[] = [
  {
    reviewId: "demo-101",
    reviewerName: "Sarah M.",
    rating: 5,
    reviewText:
      "Amazing service and super friendly staff. They made the whole process easy and quick.",
    createdAt: new Date(Date.now() - 1_000 * 60 * 60 * 12),
  },
  {
    reviewId: "demo-102",
    reviewerName: "Daniel R.",
    rating: 3,
    reviewText:
      "Good experience overall, but wait time was a bit longer than expected.",
    createdAt: new Date(Date.now() - 1_000 * 60 * 60 * 24),
  },
  {
    reviewId: "demo-103",
    reviewerName: "Emily T.",
    rating: 1,
    reviewText:
      "I was disappointed with the communication. Hoping this can be improved in the future.",
    createdAt: new Date(Date.now() - 1_000 * 60 * 60 * 48),
  },
];

export function getDemoReviews() {
  return demoReviews;
}

export async function fetchUnansweredReviewsFromGoogle(
  accessToken?: string | null,
): Promise<ExternalReview[]> {
  if (!accessToken) {
    return [];
  }

  try {
    const accountsRes = await fetch(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      {
        headers: googleHeaders(accessToken),
        cache: "no-store",
      },
    );

    if (!accountsRes.ok) {
      throw new Error(`Account fetch failed: ${accountsRes.status}`);
    }

    const accountsData = (await accountsRes.json()) as {
      accounts?: Array<{ name?: string }>;
    };

    const accountName = accountsData.accounts?.[0]?.name;
    if (!accountName) {
      return [];
    }

    const locationsRes = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?pageSize=10`,
      {
        headers: googleHeaders(accessToken),
        cache: "no-store",
      },
    );

    if (!locationsRes.ok) {
      throw new Error(`Location fetch failed: ${locationsRes.status}`);
    }

    const locationsData = (await locationsRes.json()) as {
      locations?: Array<{ name?: string }>;
    };

    const locationName = locationsData.locations?.[0]?.name;
    if (!locationName) {
      return [];
    }

    const reviewsRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${locationName}/reviews?orderBy=updateTime%20desc`,
      {
        headers: googleHeaders(accessToken),
        cache: "no-store",
      },
    );

    if (!reviewsRes.ok) {
      throw new Error(`Reviews fetch failed: ${reviewsRes.status}`);
    }

    const reviewsData = (await reviewsRes.json()) as {
      reviews?: GoogleReview[];
    };

    return (reviewsData.reviews ?? [])
      .filter((review) => !review.reviewReply?.comment)
      .map((review) => ({
        reviewId: review.name ?? review.reviewId ?? `google-${crypto.randomUUID()}`,
        reviewerName: review.reviewer?.displayName ?? "Google User",
        rating: ratingMap[review.starRating ?? "THREE"] ?? 3,
        reviewText: review.comment ?? "No text provided.",
        createdAt: review.createTime ? new Date(review.createTime) : new Date(),
      }));
  } catch (error) {
    console.error("Google reviews sync failed:", error);
    return [];
  }
}

export async function postReplyToGoogle({
  accessToken,
  reviewId,
  replyText,
}: {
  accessToken?: string | null;
  reviewId: string;
  replyText: string;
}) {
  if (reviewId.startsWith("demo-")) {
    return { posted: true };
  }

  if (!accessToken) {
    return {
      posted: false,
      reason: "Google access token is missing.",
    };
  }

  if (!reviewId.includes("/")) {
    return {
      posted: true,
      reason: "Skipped live Google post for non-resource review id.",
    };
  }

  const response = await fetch(`https://mybusiness.googleapis.com/v4/${reviewId}/reply`, {
    method: "PUT",
    headers: googleHeaders(accessToken),
    body: JSON.stringify({
      comment: replyText,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google post reply failed: ${response.status} ${body}`);
  }

  return { posted: true };
}
