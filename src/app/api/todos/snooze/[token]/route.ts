import { type NextRequest } from "next/server";

import { proxyToExpress } from "@/lib/proxy";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  return proxyToExpress(req, `/api/todos/snooze/${token}`);
}
