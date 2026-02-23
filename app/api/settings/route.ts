import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).select(
      "autoPostReplies newReviewAlertsEnabled alertEmail email",
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      settings: {
        autoPostReplies: Boolean(user.autoPostReplies),
        newReviewAlertsEnabled: user.newReviewAlertsEnabled !== false,
        alertEmail: user.alertEmail ?? user.email ?? "",
      },
    });
  } catch (error) {
    console.error("Get settings failed:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      autoPostReplies?: boolean;
      newReviewAlertsEnabled?: boolean;
      alertEmail?: string;
    };

    await connectToDatabase();

    const user = await User.findById(session.user.id).select(
      "autoPostReplies newReviewAlertsEnabled alertEmail email",
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (typeof body.autoPostReplies === "boolean") {
      user.autoPostReplies = body.autoPostReplies;
    }

    if (typeof body.newReviewAlertsEnabled === "boolean") {
      user.newReviewAlertsEnabled = body.newReviewAlertsEnabled;
    }

    if (typeof body.alertEmail === "string") {
      const normalizedEmail = body.alertEmail.trim().toLowerCase();
      if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
        return NextResponse.json({ error: "Please provide a valid alert email." }, { status: 400 });
      }

      user.alertEmail = normalizedEmail || user.email || null;
    }

    await user.save();

    return NextResponse.json({
      settings: {
        autoPostReplies: Boolean(user.autoPostReplies),
        newReviewAlertsEnabled: user.newReviewAlertsEnabled !== false,
        alertEmail: user.alertEmail ?? user.email ?? "",
      },
      message: "Settings updated.",
    });
  } catch (error) {
    console.error("Update settings failed:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
