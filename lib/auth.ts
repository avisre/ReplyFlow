import { connectToDatabase } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import type { AuthOptions, User as NextAuthUser } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

type AppUser = NextAuthUser & {
  id: string;
  subscriptionStatus: "active" | "inactive" | "trialing";
  trialEndsAt: string | null;
};

const trialEndDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date;
};

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        await connectToDatabase();

        const user = await User.findOne({ email });
        if (!user?.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          subscriptionStatus: user.subscriptionStatus,
          trialEndsAt: user.trialEndsAt ? new Date(user.trialEndsAt).toISOString() : null,
        } as AppUser;
      },
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: "consent",
                access_type: "offline",
                response_type: "code",
                scope:
                  "openid email profile https://www.googleapis.com/auth/business.manage",
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return true;
      }

      if (!user.email) {
        return false;
      }

      await connectToDatabase();

      const email = user.email.toLowerCase().trim();
      const defaultName = email.split("@")[0] ?? "ReplyFlow User";

      let dbUser = await User.findOne({ email });
      if (!dbUser) {
        dbUser = await User.create({
          name: user.name ?? defaultName,
          email,
          googleId: account.providerAccountId,
          googleAccessToken: encryptSecret(account.access_token),
          googleRefreshToken: encryptSecret(account.refresh_token),
          alertEmail: email,
          subscriptionStatus: "trialing",
          trialEndsAt: trialEndDate(),
        });
      } else {
        dbUser.name = user.name ?? dbUser.name ?? defaultName;
        dbUser.googleId = account.providerAccountId;
        dbUser.googleAccessToken = encryptSecret(account.access_token) ?? dbUser.googleAccessToken;

        if (account.refresh_token) {
          dbUser.googleRefreshToken = encryptSecret(account.refresh_token);
        }

        if (!dbUser.alertEmail) {
          dbUser.alertEmail = email;
        }

        if (!dbUser.trialEndsAt && dbUser.subscriptionStatus !== "active") {
          dbUser.trialEndsAt = trialEndDate();
          dbUser.subscriptionStatus = "trialing";
        }

        await dbUser.save();
      }

      (user as AppUser).id = dbUser._id.toString();
      (user as AppUser).subscriptionStatus = dbUser.subscriptionStatus;
      (user as AppUser).trialEndsAt = dbUser.trialEndsAt
        ? new Date(dbUser.trialEndsAt).toISOString()
        : null;

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const appUser = user as AppUser;
        token.id = appUser.id;
        token.subscriptionStatus = appUser.subscriptionStatus ?? "inactive";
        token.trialEndsAt = appUser.trialEndsAt ?? null;
      }

      if (token.id) {
        await connectToDatabase();
        const dbUser = await User.findById(token.id).select(
          "subscriptionStatus trialEndsAt",
        );

        if (dbUser) {
          if (
            dbUser.subscriptionStatus === "trialing" &&
            dbUser.trialEndsAt &&
            new Date(dbUser.trialEndsAt) < new Date()
          ) {
            dbUser.subscriptionStatus = "inactive";
            await dbUser.save();
          }

          token.subscriptionStatus = dbUser.subscriptionStatus;
          token.trialEndsAt = dbUser.trialEndsAt
            ? new Date(dbUser.trialEndsAt).toISOString()
            : null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.subscriptionStatus =
          (token.subscriptionStatus as "active" | "inactive" | "trialing") ?? "inactive";
        session.user.trialEndsAt = (token.trialEndsAt as string | null) ?? null;
      }

      return session;
    },
  },
};

export const getAuthSession = () => getServerSession(authOptions);
