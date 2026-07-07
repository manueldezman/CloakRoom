import { NextRequest, NextResponse } from "next/server";

const ZAMA_RELAYER_URL = process.env.ZAMA_RELAYER_URL;

async function proxy(
  req: NextRequest,
  params: { chainId: string; path: string[] }
) {
  if (!ZAMA_RELAYER_URL) {
    return NextResponse.json(
      { error: "ZAMA_RELAYER_URL is not configured on the server" },
      { status: 500 }
    );
  }

  const upstreamPath = params.path.join("/");
  const url = new URL(upstreamPath, ZAMA_RELAYER_URL.endsWith("/") ? ZAMA_RELAYER_URL : `${ZAMA_RELAYER_URL}/`);
  url.search = req.nextUrl.search;

  const init: RequestInit = {
    method: req.method,
    headers: { "content-type": req.headers.get("content-type") ?? "application/json" },
    body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.text(),
  };

  const upstream = await fetch(url.toString(), init);
  const body = await upstream.text();

  return new NextResponse(body, {
    status: upstream.status,
    headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: { chainId: string; path: string[] } }
) {
  return proxy(req, params);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { chainId: string; path: string[] } }
) {
  return proxy(req, params);
}
