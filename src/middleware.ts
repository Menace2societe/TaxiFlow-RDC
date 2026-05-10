import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database, UserRole } from "@/lib/supabase/types";

const protectedPrefixes = ["/dashboard", "/driver", "/investor"];
const authPrefixes = ["/login", "/signup"];

const roleHome: Record<UserRole, string> = {
  driver: "/driver/dashboard",
  investor: "/investor/dashboard",
  admin: "/dashboard/overview"
};

function redirectTo(request: NextRequest, pathname: string) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = pathname;
  redirectUrl.search = "";
  return NextResponse.redirect(redirectUrl);
}

export async function middleware(request: NextRequest) {
  console.log("Supabase URL (middleware):", process.env.NEXT_PUBLIC_SUPABASE_URL ? "OK" : "MISSING");
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isAuth = authPrefixes.some((prefix) => pathname.startsWith(prefix));

  // Protect dashboard routes. If not logged in, redirect to /login
  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If not logged in and not trying to access protected route (e.g. static files, landing page, /login)
  if (!user) {
    return response;
  }

  // --- At this point, the user IS logged in ---

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;

  if (!role) {
    return response;
  }

  // If trying to access auth pages while logged in, redirect to their home
  if (isAuth) {
    return redirectTo(request, roleHome[role]);
  }

  // Root redirects for dashboard
  if (pathname === "/dashboard" || pathname === "/driver" || pathname === "/investor") {
    return redirectTo(request, roleHome[role]);
  }

  // Restrict access based on role
  if (pathname.startsWith("/driver") && role !== "driver") {
    return redirectTo(request, roleHome[role]);
  }

  if (pathname.startsWith("/investor") && role !== "investor") {
    return redirectTo(request, roleHome[role]);
  }

  if (pathname.startsWith("/dashboard") && role !== "admin") {
    return redirectTo(request, roleHome[role]);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
