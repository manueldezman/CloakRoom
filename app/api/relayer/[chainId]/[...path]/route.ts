import { NextRequest, NextResponse } from "next/server";

const RELAYER_URLS: Record<string, string | undefined> = {
  "1": process.env.ZAMA_MAINNET_RELAYER_URL ?? "https://relayer.mainnet.zama.org/v2",
  "11155111": process.env.ZAMA_SEPOLIA_RELAYER_URL ?? "https://relayer.testnet.zama.org/v2",
};

async function proxy(
  req: NextRequest,
  params: { chainId: string; path: string[] }
) {
  const upstreamBase = RELAYER_URLS[params.chainId];
  if (!upstreamBase) {
    return NextResponse.json(
      { error: `No relayer upstream configured for chain ${params.chainId}` },
      { status: 500 }
    );
  }

  const upstreamPath = params.path.join("/");
  const url = new URL(upstreamPath, upstreamBase.endsWith("/") ? upstreamBase : `${upstreamBase}/`);
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
