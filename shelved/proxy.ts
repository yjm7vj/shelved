import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Game pages, profiles and search are public — that is what people share.
 * Anything that writes to your own account requires a session.
 */
const isProtectedRoute = createRouteMatcher([
  "/library(.*)",
  "/import(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) await auth.protect();
});

export const config = {
  matcher: [
    // Everything except Next internals and static files, unless they carry a
    // search param.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
