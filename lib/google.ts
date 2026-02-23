export type ExternalReview = {
  reviewId: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  createdAt: Date;
  locationId: string;
  locationName: string;
};

type GoogleAccount = {
  name?: string;
};

type GoogleLocation = {
  name?: string;
  title?: string;
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
    locationId: "demo-location-main",
    locationName: "Downtown Location",
  },
  {
    reviewId: "demo-102",
    reviewerName: "Daniel R.",
    rating: 3,
    reviewText:
      "Good experience overall, but wait time was a bit longer than expected.",
    createdAt: new Date(Date.now() - 1_000 * 60 * 60 * 24),
    locationId: "demo-location-main",
    locationName: "Downtown Location",
  },
  {
    reviewId: "demo-103",
    reviewerName: "Emily T.",
    rating: 1,
    reviewText:
      "I was disappointed with the communication. Hoping this can be improved in the future.",
    createdAt: new Date(Date.now() - 1_000 * 60 * 60 * 48),
    locationId: "demo-location-east",
    locationName: "Eastside Location",
  },
];

export function getDemoReviews() {
  return demoReviews;
}

async function fetchJson<T>(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: googleHeaders(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google API failed (${response.status}): ${url}`);
  }

  return (await response.json()) as T;
}

async function fetchAccounts(accessToken: string) {
  const accounts: GoogleAccount[] = [];
  let pageToken: string | null = null;

  do {
    const url = new URL("https://mybusinessaccountmanagement.googleapis.com/v1/accounts");
    url.searchParams.set("pageSize", "20");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const data = await fetchJson<{ accounts?: GoogleAccount[]; nextPageToken?: string }>(
      url.toString(),
      accessToken,
    );

    accounts.push(...(data.accounts ?? []));
    pageToken = data.nextPageToken ?? null;
  } while (pageToken);

  return accounts;
}

async function fetchLocationsForAccount(accessToken: string, accountName: string) {
  const locations: GoogleLocation[] = [];
  let pageToken: string | null = null;

  do {
    const url = new URL(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
    );
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("readMask", "name,title");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const data = await fetchJson<{ locations?: GoogleLocation[]; nextPageToken?: string }>(
      url.toString(),
      accessToken,
    );

    locations.push(...(data.locations ?? []));
    pageToken = data.nextPageToken ?? null;
  } while (pageToken);

  return locations;
}

async function fetchUnrepliedReviewsForLocation(
  accessToken: string,
  location: GoogleLocation,
): Promise<ExternalReview[]> {
  if (!location.name) {
    return [];
  }

  const reviews: ExternalReview[] = [];
  let pageToken: string | null = null;

  do {
    const url = new URL(`https://mybusiness.googleapis.com/v4/${location.name}/reviews`);
    url.searchParams.set("orderBy", "updateTime desc");
    url.searchParams.set("pageSize", "50");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const data = await fetchJson<{ reviews?: GoogleReview[]; nextPageToken?: string }>(
      url.toString(),
      accessToken,
    );

    const locationName = location.title ?? location.name.split("/").at(-1) ?? "Primary Location";

    const normalized = (data.reviews ?? [])
      .filter((review) => !review.reviewReply?.comment)
      .map((review) => ({
        reviewId: review.name ?? review.reviewId ?? `google-${crypto.randomUUID()}`,
        reviewerName: review.reviewer?.displayName ?? "Google User",
        rating: ratingMap[review.starRating ?? "THREE"] ?? 3,
        reviewText: review.comment ?? "No text provided.",
        createdAt: review.createTime ? new Date(review.createTime) : new Date(),
        locationId: location.name ?? "unknown-location",
        locationName,
      }));

    reviews.push(...normalized);
    pageToken = data.nextPageToken ?? null;
  } while (pageToken);

  return reviews;
}

export async function fetchUnansweredReviewsFromGoogle(
  accessToken?: string | null,
): Promise<ExternalReview[]> {
  if (!accessToken) {
    return [];
  }

  try {
    const accounts = await fetchAccounts(accessToken);
    if (accounts.length === 0) {
      return [];
    }

    const allReviews: ExternalReview[] = [];

    for (const account of accounts) {
      if (!account.name) {
        continue;
      }

      let locations: GoogleLocation[] = [];
      try {
        locations = await fetchLocationsForAccount(accessToken, account.name);
      } catch (error) {
        console.error(`Location fetch failed for ${account.name}:`, error);
        continue;
      }

      for (const location of locations) {
        try {
          const locationReviews = await fetchUnrepliedReviewsForLocation(accessToken, location);
          allReviews.push(...locationReviews);
        } catch (error) {
          console.error(`Review fetch failed for ${location.name ?? "unknown location"}:`, error);
        }
      }
    }

    return allReviews;
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
