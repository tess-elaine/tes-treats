/**
 * Next 16: middleware was renamed `proxy`. Runtime is `nodejs` only — same
 * runtime Auth.js v5 expects. Function name MUST be `proxy`.
 *
 * We only protect /admin here. /account is handled at page level so guests
 * still see a friendly redirect, not a 401.
 */
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const proxy = auth((req) => {
  const url = new URL(req.url);
  if (url.pathname.startsWith("/admin")) {
    const user = req.auth?.user;
    if (!user) {
      const signIn = new URL("/sign-in", req.url);
      signIn.searchParams.set("next", url.pathname);
      return NextResponse.redirect(signIn);
    }
    if (user.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*"],
};
