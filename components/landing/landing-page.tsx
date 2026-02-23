"use client";

import {
  BadgeCheck,
  Building2,
  ChevronDown,
  Dumbbell,
  Hotel,
  Menu,
  MessageCircle,
  Scissors,
  Sparkles,
  Star,
  Stethoscope,
  Utensils,
  X,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const businessTypes = [
  { icon: Utensils, label: "Restaurants" },
  { icon: Stethoscope, label: "Dental Clinics" },
  { icon: Scissors, label: "Hair Salons" },
  { icon: Hotel, label: "Hotels" },
  { icon: Dumbbell, label: "Gyms" },
];

const faqItems = [
  {
    question: "Does ReplyFlow post replies automatically without my approval?",
    answer:
      "No. By default every reply requires your one-click approval before it goes live. You can optionally enable fully automatic posting in settings.",
  },
  {
    question: "Will my customers know the replies are AI-generated?",
    answer:
      "Our AI is trained to write warm, natural, human-sounding replies. The vast majority of customers cannot tell the difference.",
  },
  {
    question: "What if I don't like the generated reply?",
    answer:
      "You can edit any reply before approving it, or regenerate a new one with one click.",
  },
  {
    question: "Does this work for multiple business locations?",
    answer: "Yes. You can connect multiple Google Business Profiles under one account.",
  },
  {
    question: "How do I connect my Google Business Profile?",
    answer:
      "Simply click \"Connect Google Account\" after signing up. It takes about 60 seconds.",
  },
];

const steps = [
  {
    title: "Connect your Google Business Profile",
    body: "Link your account in one click. We'll pull in all your unanswered reviews automatically.",
    icon: Building2,
  },
  {
    title: "AI writes a personalised reply",
    body: "Our AI reads each review and writes a warm, genuine, human-sounding response tailored to the rating and content.",
    icon: Sparkles,
  },
  {
    title: "You approve. We post.",
    body: "Hit approve and ReplyFlow posts the reply to Google instantly. Done in under 10 seconds per review.",
    icon: BadgeCheck,
  },
];

const features = [
  {
    icon: "⚡",
    title: "Instant AI Replies",
    text: "Replies generated in under 3 seconds, tailored to every review",
  },
  {
    icon: "🎯",
    title: "Tone Matching",
    text: "Responds differently to 5-star praise vs 1-star complaints",
  },
  {
    icon: "📬",
    title: "Auto Posting",
    text: "Approved replies go live on Google automatically",
  },
  {
    icon: "🔔",
    title: "New Review Alerts",
    text: "Get notified by email the moment a new review comes in",
  },
  {
    icon: "📊",
    title: "Review Dashboard",
    text: "See all your reviews, reply status, and star rating trends in one place",
  },
  {
    icon: "🔒",
    title: "Secure & Private",
    text: "Your Google credentials are encrypted and never stored in plain text",
  },
];

const testimonials = [
  {
    quote:
      "We were sitting on 40 unanswered reviews. ReplyFlow cleared them all in 20 minutes. Our Google ranking went up within 2 weeks.",
    name: "Marcus T.",
    role: "Restaurant Owner",
    initials: "MT",
    color: "bg-amber-500",
  },
  {
    quote:
      "I used to spend Sunday evenings writing review replies. Now I just hit approve on my phone while having my morning coffee.",
    name: "Priya S.",
    role: "Dental Clinic Manager",
    initials: "PS",
    color: "bg-emerald-500",
  },
  {
    quote:
      "The replies sound exactly like me — warm and personal. None of my customers have ever suspected it was AI.",
    name: "James O.",
    role: "Hotel Manager",
    initials: "JO",
    color: "bg-indigo-500",
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const trustLine = useMemo(
    () =>
      "✓ Setup in 2 minutes  ✓ Cancel anytime  ✓ Works with any Google Business profile",
    [],
  );

  return (
    <div className="bg-[#F9FAFB]">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold text-indigo-600">ReplyFlow</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-gray-700 md:flex">
            <a href="#features" className="transition-all duration-200 hover:text-indigo-600">
              Features
            </a>
            <a href="#pricing" className="transition-all duration-200 hover:text-indigo-600">
              Pricing
            </a>
            <a href="#faq" className="transition-all duration-200 hover:text-indigo-600">
              FAQ
            </a>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="btn-base border border-transparent text-gray-700 hover:bg-gray-100"
            >
              Login
            </Link>
            <Link href="/register" className="btn-primary">
              Start Free Trial
            </Link>
          </div>

          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="rounded-xl border border-gray-200 p-2 text-gray-700 transition-all duration-200 hover:bg-gray-100 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-gray-100 bg-white px-5 pb-5 pt-3 md:hidden">
            <div className="flex flex-col gap-3 text-sm font-medium">
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>
                Features
              </a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>
                FAQ
              </a>
              <div className="mt-2 flex flex-col gap-2">
                <Link href="/login" className="btn-secondary text-center">
                  Login
                </Link>
                <Link href="/register" className="btn-primary text-center">
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 to-indigo-800">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-5 py-20 lg:grid-cols-2 lg:px-8">
          <div className="space-y-8">
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
              Stop ignoring your Google reviews. Start winning more customers.
            </h1>
            <p className="max-w-2xl text-lg text-indigo-100 md:text-xl">
              ReplyFlow uses AI to write personalised, professional replies to every Google
              review you receive — so you never miss one again. One click to approve.
              Automatically posted.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="btn-base rounded-full bg-white px-6 py-3 font-semibold text-indigo-700 hover:bg-indigo-50"
              >
                Start Free Trial — No Card Required
              </Link>
              <a
                href="#how-it-works"
                className="btn-base rounded-full border border-white px-6 py-3 font-semibold text-white hover:bg-white/10"
              >
                See How It Works
              </a>
            </div>
            <p className="text-sm font-medium text-indigo-200">{trustLine}</p>
          </div>

          <div className="relative">
            <div className="card-base mx-auto max-w-xl overflow-hidden border-indigo-100 bg-white/95 p-6 shadow-2xl backdrop-blur">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Review Inbox</p>
                  <p className="text-xs text-gray-500">3 awaiting replies</p>
                </div>
                <span className="badge-positive">AI Ready</span>
              </div>

              {["Anna P.", "Rob K.", "Maya D."].map((name, index) => (
                <div key={name} className="mb-4 rounded-xl border border-gray-100 bg-gray-50 p-4 last:mb-0">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-800">{name}</p>
                    <div className="flex items-center gap-1 text-amber-500">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3.5 w-3.5 ${star <= (index === 1 ? 3 : 5) ? "fill-current" : "text-gray-300"}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-gray-600">
                    {index === 0
                      ? "Loved the service and the team was incredibly helpful."
                      : index === 1
                        ? "Good experience but I had to wait a bit longer than expected."
                        : "Fantastic results. Will definitely recommend to friends."}
                  </p>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-xs text-emerald-700">
                    {index === 1
                      ? "Hi Rob, thank you for your feedback. We appreciate your patience and are improving wait times right away."
                      : `Thanks ${name.split(" ")[0]}! We truly appreciate your kind words and look forward to serving you again soon.`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-100 py-8">
        <div className="mx-auto max-w-6xl px-5 text-center lg:px-8">
          <p className="mb-6 text-sm font-semibold uppercase tracking-wide text-gray-600">
            Trusted by 500+ local businesses
          </p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {businessTypes.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-5 text-center lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Unanswered reviews are silently killing your business
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              {
                value: "87%",
                text: "of customers read responses to reviews before visiting",
              },
              {
                value: "45%",
                text: "of customers say they'd visit a business more if it responds to reviews",
              },
              {
                value: "8 in 10",
                text: "business owners say they don't have time to respond to every review",
              },
            ].map((stat) => (
              <div key={stat.value} className="card-base p-8 text-left">
                <p className="text-4xl font-bold text-indigo-600">{stat.value}</p>
                <p className="mt-2 text-gray-600">{stat.text}</p>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-4xl text-gray-600">
            Google actively rewards businesses that respond to reviews with higher local search
            rankings. Every unanswered review is a missed opportunity to rank higher and win a
            customer.
          </p>
        </div>
      </section>

      <section id="how-it-works" className="bg-gray-100 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Replies written, approved, and posted in seconds
          </h2>
          <div className="relative mt-12 grid gap-8 lg:grid-cols-3">
            <div className="absolute left-1/2 top-10 hidden h-0.5 w-[70%] -translate-x-1/2 bg-indigo-200 lg:block" />
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="card-base relative z-10 p-7">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                      {index + 1}
                    </div>
                    <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{step.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Everything you need to manage your reputation
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="card-base p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-3 text-2xl">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-indigo-50 py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            What our customers are saying
          </h2>
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div key={testimonial.name} className="card-base p-6">
                <div className="mb-4 flex items-center gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${testimonial.color}`}
                  >
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-xs text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-5 text-center lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">One simple plan. No surprises.</h2>
          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-indigo-100 bg-white p-8 shadow-xl">
            <span className="inline-flex rounded-full bg-indigo-100 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Most Popular
            </span>
            <div className="mt-5 flex items-end justify-center gap-2">
              <span className="text-5xl font-bold text-gray-900">$29</span>
              <span className="mb-1 text-base text-gray-500">/month</span>
            </div>
            <p className="mt-3 text-gray-600">
              Everything you need to manage your Google reviews
            </p>
            <ul className="mt-7 space-y-3 text-left text-sm text-gray-700">
              {[
                "Unlimited AI-generated replies",
                "Auto-posting to Google",
                "New review email alerts",
                "Full review dashboard",
                "Tone-matched responses",
                "Cancel anytime",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-emerald-500">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register" className="btn-primary mt-8 w-full justify-center">
              Start Free 14-Day Trial
            </Link>
            <p className="mt-3 text-xs text-gray-500">No credit card required to start</p>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-gray-100 py-20">
        <div className="mx-auto max-w-4xl px-5 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">Frequently asked questions</h2>
          <div className="mt-10 space-y-4">
            {faqItems.map((item, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={item.question} className="card-base overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between px-6 py-5 text-left transition-all duration-200 hover:bg-gray-50"
                  >
                    <span className="text-sm font-semibold text-gray-900 sm:text-base">
                      Q: {item.question}
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 transition-all duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen ? (
                    <div className="border-t border-gray-100 px-6 py-4 text-sm leading-relaxed text-gray-600">
                      A: {item.answer}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-indigo-600 to-indigo-800 py-20 text-center">
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <h2 className="text-4xl font-bold text-white">Your next 5-star review deserves a reply.</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-indigo-200">
            Join 500+ businesses that never miss a review.
          </p>
          <Link
            href="/register"
            className="btn-base mt-8 rounded-full bg-white px-6 py-3 font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            Get Started Free Today
          </Link>
        </div>
      </section>

      <footer className="bg-[#111827] py-12 text-gray-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-indigo-600 p-2 text-white">
                <MessageCircle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-semibold text-white">ReplyFlow</p>
                <p className="text-sm text-gray-400">
                  AI-powered review management for local businesses
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <a href="#features" className="transition-all duration-200 hover:text-white">
                Features
              </a>
              <a href="#pricing" className="transition-all duration-200 hover:text-white">
                Pricing
              </a>
              <a href="#faq" className="transition-all duration-200 hover:text-white">
                FAQ
              </a>
              <Link href="/login" className="transition-all duration-200 hover:text-white">
                Login
              </Link>
              <Link href="/privacy" className="transition-all duration-200 hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="transition-all duration-200 hover:text-white">
                Terms of Service
              </Link>
            </div>
          </div>
          <p className="text-xs text-gray-500">© 2025 ReplyFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
