import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      subscriptionStatus: "active" | "inactive" | "trialing";
      trialEndsAt: string | null;
    };
  }

  interface User extends DefaultUser {
    id: string;
    subscriptionStatus?: "active" | "inactive" | "trialing";
    trialEndsAt?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    subscriptionStatus?: "active" | "inactive" | "trialing";
    trialEndsAt?: string | null;
  }
}
