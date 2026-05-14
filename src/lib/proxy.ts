import { type NextRequest, NextResponse } from "next/server";

const EXPRESS_URL = process.env.EXPRESS_URL ?? "http://localhost:4000";

export async function proxyToExpress(req: NextRequest, pathname: string): Promise<NextResponse> {
  const target = new URL(pathname + req.nextUrl.search, EXPRESS_URL).toString();

  const forwardHeaders = new Headers();
  const cookie = req.headers.get("cookie");
  if (cookie) forwardHeaders.set("cookie", cookie);
  const contentType = req.headers.get("content-type");
  if (contentType) forwardHeaders.set("content-type", contentType);

  const init: RequestInit & { duplex?: string } = {
    method: req.method,
    headers: forwardHeaders,
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await req.arrayBuffer();
    if (body.byteLength > 0) init.body = body;
  }

  const upstream = await fetch(target, init as RequestInit);

  const resHeaders = new Headers();
  resHeaders.set("content-type", upstream.headers.get("content-type") ?? "application/json");
  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) resHeaders.set("set-cookie", setCookie);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  });
}