import { type NextRequest } from "next/server";

import { proxyToExpress } from "@/lib/proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyToExpress(req, `/api/todos/${id}`);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyToExpress(req, `/api/todos/${id}`);
}
