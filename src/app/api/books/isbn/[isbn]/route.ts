import { type NextRequest } from "next/server";
import { proxyToExpress } from "@/lib/proxy";

type RouteContext = { params: Promise<{ isbn: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { isbn } = await context.params;
  return proxyToExpress(req, `/api/books/isbn/${isbn}`);
}
