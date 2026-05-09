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
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
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

  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (!user) {
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;

  if (!role) {
    return response;
  }

  if (isAuth) {
    return redirectTo(request, roleHome[role]);
  }

  if (pathname === "/dashboard" || pathname === "/driver" || pathname === "/investor") {
    return redirectTo(request, roleHome[role]);
  }

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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
