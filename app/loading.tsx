import LoadingSpinner from "@/components/common/loading-spinner";

export default function GlobalLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
          <LoadingSpinner className="h-5 w-5 text-indigo-600" />
          Loading ReplyFlow...
        </div>
      </div>
    </main>
  );
}
