import { type NextRequest } from "next/server";

import { proxyToExpress } from "@/lib/proxy";

export async function GET(req: NextRequest) {
  return proxyToExpress(req, "/api/todos");
}

export async function POST(req: NextRequest) {
  return proxyToExpress(req, "/api/todos");
}
