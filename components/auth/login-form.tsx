"use client";

import LoadingSpinner from "@/components/common/loading-spinner";
import { MessageCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleCredentialsLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl: "/dashboard",
        redirect: false,
      });

      if (result?.error) {
        toast.error("Invalid email or password.");
        return;
      }

      toast.success("Logged in successfully.");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Unable to login right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      await signIn("google", {
        callbackUrl: "/dashboard",
      });
    } catch (error) {
      console.error(error);
      toast.error("Google sign-in failed.");
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] px-5 py-10">
      <div className="mx-auto flex max-w-md flex-col gap-6">
        <Link href="/" className="mx-auto flex items-center gap-2">
          <span className="rounded-lg bg-indigo-100 p-2 text-indigo-600">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="text-xl font-bold text-indigo-600">ReplyFlow</span>
        </Link>

        <div className="card-base p-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-600">Sign in to manage your Google reviews.</p>

          <form onSubmit={handleCredentialsLogin} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-indigo-500"
                placeholder="you@business.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-indigo-500"
                placeholder="••••••••"
              />
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
              {isSubmitting ? (
                <>
                  <LoadingSpinner />
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs uppercase tracking-wide text-gray-500">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="btn-secondary w-full justify-center"
          >
            {isGoogleLoading ? (
              <>
                <LoadingSpinner className="text-indigo-600" />
                Redirecting...
              </>
            ) : (
              "Continue with Google"
            )}
          </button>

          <p className="mt-6 text-center text-sm text-gray-600">
            New to ReplyFlow?{" "}
            <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
