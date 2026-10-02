import type { NextRequest } from "next/server";

/** Absolute URL on this site for a relative path, honoring proxies (x-forwarded-host) in production. */
export function siteUrl(request: NextRequest, path: string): URL {
  const origin = new URL(request.url).origin;
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (process.env.NODE_ENV !== "development" && forwardedHost) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return new URL(path, `${proto}://${forwardedHost}`);
  }
  return new URL(path, origin);
}
