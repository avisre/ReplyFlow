import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

export function getAuthSession() {
  return getServerSession(authOptions);
}
