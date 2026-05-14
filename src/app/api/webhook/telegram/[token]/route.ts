import { type NextRequest } from "next/server";

import { proxyToExpress } from "@/lib/proxy";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  return proxyToExpress(req, `/api/webhook/telegram/${token}`);
}