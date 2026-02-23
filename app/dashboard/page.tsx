import DashboardApp from "@/components/dashboard/dashboard-app";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return <DashboardApp />;
}
