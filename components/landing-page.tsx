"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bot,
  ChevronDown,
  Dumbbell,
  Hotel,
  Link2,
  Menu,
  MessageCircle,
  Scissors,
  Send,
  Star,
  Stethoscope,
  UtensilsCrossed,
  X,
} from "lucide-react";

const faqs = [
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
    answer:
      "Yes. You can connect multiple Google Business Profiles under one account.",
  },
  {
    question: "How do I connect my Google Business Profile?",
    answer:
      "Simply click \"Connect Google Account\" after signing up. It takes about 60 seconds.",
  },
];

const socialTypes = [
  { label: "Restaurants", icon: UtensilsCrossed },
  { label: "Dental Clinics", icon: Stethoscope },
  { label: "Hair Salons", icon: Scissors },
  { label: "Hotels", icon: Hotel },
  { label: "Gyms", icon: Dumbbell },
];

const featureCards = [
  {
    title: "⚡ Instant AI Replies",
    description: "Replies generated in under 3 seconds, tailored to every review",
  },
  {
    title: "🎯 Tone Matching",
    description: "Responds differently to 5-star praise vs 1-star complaints",
  },
  {
    title: "📬 Auto Posting",
    description: "Approved replies go live on Google automatically",
  },
  {
    title: "🔔 New Review Alerts",
    description: "Get notified by email the moment a new review comes in",
  },
  {
    title: "📊 Review Dashboard",
    description:
      "See all your reviews, reply status, and star rating trends in one place",
  },
  {
    title: "🔒 Secure & Private",
    description:
      "Your Google credentials are encrypted and never stored in plain text",
  },
];

const steps = [
  {
    number: 1,
    title: "Connect your Google Business Profile",
    description:
      "Link your account in one click. We'll pull in all your unanswered reviews automatically.",
    icon: Link2,
  },
  {
    number: 2,
    title: "AI writes a personalised reply",
    description:
      "Our AI reads each review and writes a warm, genuine, human-sounding response tailored to the rating and content.",
    icon: Bot,
  },
  {
    number: 3,
    title: "You approve. We post.",
    description:
      "Hit approve and ReplyFlow posts the reply to Google instantly. Done in under 10 seconds per review.",
    icon: Send,
  },
];

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="bg-[#F9FAFB] text-[#111827]">
      <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/95 backdrop-blur">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-100 p-2 text-indigo-600">
              <MessageCircle className="h-4 w-4" />
            </span>
            <span className="text-xl font-bold text-indigo-600">ReplyFlow</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-gray-700 transition-all duration-200 hover:text-indigo-600">
              Features
            </a>
            <a href="#pricing" className="text-sm text-gray-700 transition-all duration-200 hover:text-indigo-600">
              Pricing
            </a>
            <a href="#faq" className="text-sm text-gray-700 transition-all duration-200 hover:text-indigo-600">
              FAQ
            </a>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="rounded-full px-6 py-3 text-sm font-semibold text-indigo-600 transition-all duration-200 hover:bg-indigo-50"
            >
              Login
            </Link>
            <Link href="/register" className="btn-primary text-sm">
              Start Free Trial
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="rounded-full border border-gray-200 p-2 text-gray-700 md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>

        {mobileOpen ? (
          <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#features" className="rounded-xl px-3 py-2 text-sm font-medium text-gray-700" onClick={() => setMobileOpen(false)}>
                Features
              </a>
              <a href="#pricing" className="rounded-xl px-3 py-2 text-sm font-medium text-gray-700" onClick={() => setMobileOpen(false)}>
                Pricing
              </a>
              <a href="#faq" className="rounded-xl px-3 py-2 text-sm font-medium text-gray-700" onClick={() => setMobileOpen(false)}>
                FAQ
              </a>
              <Link href="/login" className="btn-secondary text-center text-sm" onClick={() => setMobileOpen(false)}>
                Login
              </Link>
              <Link href="/register" className="btn-primary text-center text-sm" onClick={() => setMobileOpen(false)}>
                Start Free Trial
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      <section className="bg-gradient-to-br from-indigo-600 to-indigo-800">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
              Stop ignoring your Google reviews. Start winning more customers.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-indigo-100 md:text-xl">
              ReplyFlow uses AI to write personalised, professional replies to every
              Google review you receive — so you never miss one again. One click to
              approve. Automatically posted.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="rounded-full bg-white px-6 py-3 text-center font-semibold text-indigo-700 transition-all duration-200 hover:bg-indigo-50"
              >
                Start Free Trial — No Card Required
              </Link>
              <a
                href="#how-it-works"
                className="rounded-full border border-white px-6 py-3 text-center font-semibold text-white transition-all duration-200 hover:bg-white/10"
              >
                See How It Works
              </a>
            </div>

            <p className="mt-6 text-sm text-indigo-200">
              ✓ Setup in 2 minutes  ✓ Cancel anytime  ✓ Works with any Google
              Business profile
            </p>
          </div>

          <div className="relative">
            <div className="mx-auto w-full max-w-xl rounded-2xl border border-indigo-400/30 bg-white/95 p-4 shadow-xl backdrop-blur">
              <div className="mb-4 rounded-xl bg-indigo-50 px-4 py-3">
                <p className="text-sm font-semibold text-indigo-700">Review Dashboard</p>
                <p className="text-xs text-indigo-500">3 reviews awaiting action</p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    name: "Emma R.",
                    review: "Loved the team and the quick service.",
                    reply:
                      "Thanks Emma. We are thrilled you had a great experience and truly appreciate your kind words.",
                  },
                  {
                    name: "Dylan M.",
                    review: "The food was great but we waited too long.",
                    reply:
                      "Thank you for the feedback Dylan. We are improving wait times and hope to serve you faster next visit.",
                  },
                  {
                    name: "Nina P.",
                    review: "Super clean, friendly staff, and easy booking.",
                    reply:
                      "Nina, this means a lot. Thanks for trusting us and sharing your experience.",
                  },
                ].map((item) => (
                  <div key={item.name} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                      <div className="flex text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={`${item.name}-${i}`} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{item.review}</p>
                    <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
                      AI Reply: {item.reply}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-100 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-lg font-semibold text-gray-800">Trusted by 500+ local businesses</p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {socialTypes.map((type) => (
              <div key={type.label} className="rounded-xl bg-white p-4 shadow-sm">
                <type.icon className="mx-auto h-6 w-6 text-indigo-600" />
                <p className="mt-2 text-sm font-medium text-gray-700">{type.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Unanswered reviews are silently killing your business
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="card-base p-6 text-center">
              <p className="text-4xl font-bold text-indigo-600">87%</p>
              <p className="mt-2 text-sm text-gray-600">
                of customers read responses to reviews before visiting
              </p>
            </div>
            <div className="card-base p-6 text-center">
              <p className="text-4xl font-bold text-indigo-600">45%</p>
              <p className="mt-2 text-sm text-gray-600">
                of customers say they&apos;d visit a business more if it responds to
                reviews
              </p>
            </div>
            <div className="card-base p-6 text-center">
              <p className="text-4xl font-bold text-indigo-600">8 in 10</p>
              <p className="mt-2 text-sm text-gray-600">
                business owners say they don&apos;t have time to respond to every
                review
              </p>
            </div>
          </div>

          <p className="mx-auto mt-8 max-w-4xl text-center text-lg text-gray-600">
            Google actively rewards businesses that respond to reviews with higher
            local search rankings. Every unanswered review is a missed opportunity
            to rank higher and win a customer.
          </p>
        </div>
      </section>

      <section id="how-it-works" className="bg-gray-100 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Replies written, approved, and posted in seconds
          </h2>

          <div className="relative mt-12 grid gap-6 md:grid-cols-3">
            <div className="absolute left-[16.6%] right-[16.6%] top-10 hidden h-0.5 bg-indigo-200 md:block" />

            {steps.map((step) => (
              <div key={step.number} className="relative z-10 rounded-2xl bg-white p-6 shadow-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-2xl font-bold text-white">
                  {step.number}
                </div>
                <step.icon className="mx-auto mb-3 h-6 w-6 text-indigo-600" />
                <h3 className="text-center text-lg font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-3 text-center text-sm text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Everything you need to manage your reputation
          </h2>

          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => (
              <div key={feature.title} className="card-base p-6 transition-all duration-200 hover:shadow-md">
                <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-indigo-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            What our customers are saying
          </h2>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                quote:
                  "We were sitting on 40 unanswered reviews. ReplyFlow cleared them all in 20 minutes. Our Google ranking went up within 2 weeks.",
                name: "Marcus T.",
                role: "Restaurant Owner",
                initials: "MT",
                color: "bg-indigo-600",
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
                color: "bg-amber-500",
              },
            ].map((testimonial) => (
              <div key={testimonial.name} className="rounded-2xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={`${testimonial.name}-${i}`} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700">&quot;{testimonial.quote}&quot;</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white ${testimonial.color}`}>
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
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">One simple plan. No surprises.</h2>

          <div className="mx-auto mt-10 w-full max-w-lg rounded-2xl border border-indigo-100 bg-white p-8 shadow-xl">
            <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
              Most Popular
            </span>
            <div className="mt-4 flex items-end justify-center gap-2">
              <p className="text-6xl font-bold text-gray-900">$29</p>
              <p className="pb-2 text-lg text-gray-500">/month</p>
            </div>
            <p className="mt-3 text-gray-600">Everything you need to manage your Google reviews</p>

            <ul className="mt-6 space-y-3 text-left">
              {[
                "Unlimited AI-generated replies",
                "Auto-posting to Google",
                "New review email alerts",
                "Full review dashboard",
                "Tone-matched responses",
                "Cancel anytime",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 text-emerald-500">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Link href="/register" className="btn-primary mt-8 block text-center">
              Start Free 14-Day Trial
            </Link>
            <p className="mt-3 text-xs text-gray-500">No credit card required to start</p>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-gray-100 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            Frequently asked questions
          </h2>

          <div className="mt-10 space-y-4">
            {faqs.map((faq, index) => {
              const open = openFaq === index;

              return (
                <div key={faq.question} className="rounded-2xl bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  >
                    <span className="font-semibold text-gray-900">{faq.question}</span>
                    <ChevronDown className={`h-5 w-5 shrink-0 text-indigo-600 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`} />
                  </button>
                  {open ? <p className="px-6 pb-5 text-sm text-gray-600">{faq.answer}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-indigo-600 to-indigo-800 py-20 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white">
            Your next 5-star review deserves a reply.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-indigo-200">
            Join 500+ businesses that never miss a review.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex rounded-full bg-white px-6 py-3 font-semibold text-indigo-700 transition-all duration-200 hover:bg-indigo-50"
          >
            Get Started Free Today
          </Link>
        </div>
      </section>

      <footer className="bg-[#111827] py-12 text-gray-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xl font-bold text-white">ReplyFlow</p>
              <p className="mt-1 text-sm text-gray-400">
                ReplyFlow — AI-powered review management for local businesses
              </p>
            </div>
            <div className="flex flex-wrap gap-5 text-sm">
              <a href="#features" className="transition-all duration-200 hover:text-white">Features</a>
              <a href="#pricing" className="transition-all duration-200 hover:text-white">Pricing</a>
              <a href="#faq" className="transition-all duration-200 hover:text-white">FAQ</a>
              <Link href="/login" className="transition-all duration-200 hover:text-white">Login</Link>
              <Link href="/privacy" className="transition-all duration-200 hover:text-white">Privacy Policy</Link>
              <Link href="/terms" className="transition-all duration-200 hover:text-white">Terms of Service</Link>
            </div>
          </div>
          <p className="text-xs text-gray-500">© 2025 ReplyFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
