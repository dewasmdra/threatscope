import { NextResponse, type NextRequest } from "next/server";
import { isValidMonth } from "@/lib/month";

/**
 * Rejects unknown report periods before routing.
 *
 * Doing this in the page via notFound() renders the right body but leaves the status at 200,
 * because a dynamic segment has already committed its response headers by then. Rewriting to
 * an unrouted path here makes Next serve app/not-found.tsx with a real 404.
 */
export function proxy(req: NextRequest) {
  const month = req.nextUrl.pathname.split("/")[2];
  if (month && !isValidMonth(month)) {
    return NextResponse.rewrite(new URL("/__unknown-report-period", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: "/report/:month" };
