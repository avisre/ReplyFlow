import Providers from "@/components/providers";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "ReplyFlow | AI Review Reply Assistant",
    template: "%s | ReplyFlow",
  },
  description:
    "AI-powered review management for local businesses. Reply to Google reviews in seconds with warm, human-sounding responses.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} bg-[#F9FAFB] text-[#111827] antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
