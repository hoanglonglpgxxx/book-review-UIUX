import { type NextRequest } from "next/server";
import { proxyToExpress } from "@/lib/proxy";

export async function PATCH(req: NextRequest) {
  return proxyToExpress(req, "/api/users/me");
}
