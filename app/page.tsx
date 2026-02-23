import LandingPage from "@/components/landing/landing-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ReplyFlow | Stop Ignoring Your Google Reviews",
  description:
    "ReplyFlow uses AI to write personalised, professional replies to every Google review you receive. One click to approve. Automatically posted.",
  openGraph: {
    title: "ReplyFlow | AI-Powered Google Review Replies",
    description:
      "Join 500+ local businesses using ReplyFlow to respond to reviews in seconds and win more customers.",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "ReplyFlow dashboard preview",
      },
    ],
  },
};

export default function HomePage() {
  return <LandingPage />;
}
