import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const expectedUser = process.env.APP_USERNAME;
  const expectedPassword = process.env.APP_PASSWORD;
  const path = request.nextUrl.pathname;

  if (!expectedUser || !expectedPassword || path.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    try {
      const [user, password] = atob(authorization.slice(6)).split(":");
      if (user === expectedUser && password === expectedPassword) return NextResponse.next();
    } catch {}
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Dimaso RFP Radar", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
