import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const name = body.name?.trim();
    const email = body.email?.toLowerCase().trim();
    const password = body.password;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 },
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const createdUser = await User.create({
      name,
      email,
      passwordHash,
      alertEmail: email,
      subscriptionStatus: "trialing",
      trialEndsAt,
    });

    return NextResponse.json(
      {
        message: "Registration successful.",
        user: {
          id: createdUser._id.toString(),
          email: createdUser.email,
          name: createdUser.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Register route error:", error);
    return NextResponse.json({ error: "Failed to register user." }, { status: 500 });
  }
}
