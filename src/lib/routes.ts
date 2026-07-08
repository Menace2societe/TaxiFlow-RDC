/**
 * Centralized routes — use these instead of hardcoded path strings.
 * Safe for Edge (middleware) and Server/Client bundles.
 */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  SIGNUP: "/signup",
  DRIVER_PORTAL: "/driver/portal",
  DRIVER_DASHBOARD: "/driver/dashboard",
  DRIVER_MAINTENANCE: "/driver/maintenance",
  DRIVER_DOCUMENTS: "/driver/documents",
  DRIVER_PROFILE: "/driver/profile",
  INVESTOR_DASHBOARD: "/investor/dashboard",
  INVESTOR_FLEET: "/investor/fleet",
  INVESTOR_REVENUE: "/investor/revenue",
  INVESTOR_DOCUMENTS: "/investor/documents",
  INVESTOR_SETTINGS: "/investor/settings",
  DASHBOARD_OVERVIEW: "/dashboard/overview",
  DASHBOARD_ENTRIES: "/dashboard/entries",
  DASHBOARD_FLEET: "/dashboard/fleet",
  DASHBOARD_USERS: "/dashboard/users",
  DASHBOARD_REPORTS: "/dashboard/reports",
  /** Prefix for `revalidatePath` (layout segment). */
  DASHBOARD_ROOT: "/dashboard",
  AUTH_SIGNOUT: "/auth/signout"
} as const;

export type RouteKey = keyof typeof ROUTES;
export type AppRoute = (typeof ROUTES)[RouteKey];

/** Build /login?next=… for post-auth return (caller must encode if needed). */
export function loginWithNext(nextPath: string): string {
  return `${ROUTES.LOGIN}?next=${encodeURIComponent(nextPath)}`;
}

/**
 * Validates `next` after login / deep links: internal path only, no open redirects, no auth loops.
 */
export function isSafeInternalPath(path?: string | null): path is string {
  if (path == null || typeof path !== "string") {
    return false;
  }
  const trimmed = path.trim();
  const pathname = (trimmed.split("?")[0] ?? "").split("#")[0] ?? "";
  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    return false;
  }
  const lower = pathname.toLowerCase();
  if (
    lower.includes("/login") ||
    lower.includes("/register") ||
    lower.includes("/signup")
  ) {
    return false;
  }
  return true;
}
