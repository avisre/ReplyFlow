"use client";

import LoadingSpinner from "@/components/common/loading-spinner";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

type GeneratedReplyOption = {
  key: "quick_pro" | "warm_personal" | "growth_recovery";
  label: string;
  text: string;
  wordCount: number;
};

type DummyResponse = {
  generatedReply?: string;
  options?: GeneratedReplyOption[];
  error?: string;
};

export default function DummyGeminiPage() {
  const [reviewerName, setReviewerName] = useState("Sarah M.");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState(
    "Amazing service and super friendly staff. They made everything easy.",
  );
  const [options, setOptions] = useState<GeneratedReplyOption[]>([]);
  const [editedReply, setEditedReply] = useState("");
  const [selectedOptionKey, setSelectedOptionKey] = useState<string>("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      const response = await fetch("/api/dummy/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewerName,
          rating,
          reviewText,
        }),
      });

      const data = (await response.json()) as DummyResponse;
      if (!response.ok || !data.generatedReply) {
        throw new Error(data.error ?? "Failed to generate reply.");
      }

      const generatedOptions = data.options?.length
        ? data.options
        : [
            {
              key: "warm_personal" as const,
              label: "Warm Personal",
              text: data.generatedReply,
              wordCount: data.generatedReply.trim().split(/\s+/).filter(Boolean).length,
            },
          ];

      setOptions(generatedOptions);
      setSelectedOptionKey(generatedOptions[0]?.key ?? "");
      setEditedReply(generatedOptions[0]?.text ?? "");
      setLastSavedAt(null);
      toast.success("3 professional options generated.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to generate reply.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (option: GeneratedReplyOption) => {
    setSelectedOptionKey(option.key);
    setEditedReply(option.text);
  };

  const handleDeleteDraft = () => {
    setEditedReply("");
    setSelectedOptionKey("");
    setLastSavedAt(null);
    toast.success("Draft cleared.");
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    setLastSavedAt(new Date().toLocaleTimeString());
    setIsSaving(false);
    toast.success("Edited reply saved in dummy workspace.");
  };

  return (
    <main className="min-h-screen bg-[#F9FAFB] px-5 py-10 text-[#111827] lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Gemini Reply Sandbox</h1>
            <p className="mt-1 text-sm text-gray-600">
              Test speed, 3 professional options, and edit/delete flow before dashboard posting.
            </p>
          </div>
          <Link href="/dashboard" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="card-base p-6">
            <h2 className="text-lg font-semibold text-gray-900">1) Draft Review Input</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Reviewer Name</label>
                <input
                  value={reviewerName}
                  onChange={(event) => setReviewerName(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Star Rating</label>
                <select
                  value={rating}
                  onChange={(event) => setRating(Number(event.target.value))}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-indigo-500"
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} Star{value > 1 ? "s" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Review Text</label>
                <textarea
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  rows={6}
                  className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="btn-primary w-full justify-center"
              >
                {isGenerating ? (
                  <>
                    <LoadingSpinner />
                    Generating 3 options...
                  </>
                ) : (
                  "Generate 3 Professional Replies"
                )}
              </button>
            </div>
          </section>

          <section className="card-base p-6">
            <h2 className="text-lg font-semibold text-gray-900">2) Select, Edit, or Delete Draft</h2>
            <p className="mt-1 text-sm text-gray-600">
              Pick one option, edit as needed, or delete before final posting.
            </p>

            {options.length > 0 ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {options.map((option) => {
                  const isActive = selectedOptionKey === option.key;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleSelectOption(option)}
                      className={`rounded-xl border px-3 py-2 text-left transition-all duration-200 ${
                        isActive
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40"
                      }`}
                    >
                      <p className="text-xs font-semibold text-indigo-700">{option.label}</p>
                      <p className="mt-1 text-xs text-gray-500">{option.wordCount} words</p>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              <label className="text-sm font-medium text-gray-700">Editable Reply</label>
              <textarea
                value={editedReply}
                onChange={(event) => setEditedReply(event.target.value)}
                rows={10}
                placeholder={
                  options.length > 0
                    ? ""
                    : "Generate reply options from the left panel, then select and edit here."
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-indigo-500"
              />

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!editedReply.trim() || isSaving}
                  className="btn-base w-full justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <LoadingSpinner />
                      Saving...
                    </>
                  ) : (
                    "Save Edited Reply"
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDeleteDraft}
                  disabled={!editedReply.trim()}
                  className="btn-base w-full justify-center rounded-full border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  Delete Draft
                </button>
              </div>

              {lastSavedAt ? (
                <p className="text-xs font-medium text-emerald-700">Saved at {lastSavedAt}</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
