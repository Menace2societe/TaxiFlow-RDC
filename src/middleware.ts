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

export async function middleware(request: NextRequest) {
  console.log("Supabase URL (middleware):", process.env.NEXT_PUBLIC_SUPABASE_URL ? "OK" : "MISSING");
  
  let supabaseResponse = NextResponse.next({
    request,
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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
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
    return supabaseResponse;
  }

  // --- At this point, the user IS logged in ---

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;

  if (!role) {
    // Profil introuvable : laisse passer pour que le Layout gère la redirection ou l'erreur
    return supabaseResponse;
  }

  // Helper pour rediriger TOUT EN CONSERVANT les cookies rafraîchis par Supabase
  const redirectWithCookies = (targetPath: string) => {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = targetPath;
    redirectUrl.search = "";
    const redirectResp = NextResponse.redirect(redirectUrl);
    
    // Transférer les cookies du supabaseResponse vers la redirection
    supabaseResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        redirectResp.headers.append(key, value);
      }
    });
    
    return redirectResp;
  };

  // If trying to access auth pages while logged in, redirect to their home
  if (isAuth) {
    return redirectWithCookies(roleHome[role]);
  }

  // Root redirects for dashboard
  if (pathname === "/dashboard" || pathname === "/driver" || pathname === "/investor") {
    return redirectWithCookies(roleHome[role]);
  }

  // Restrict access based on role
  if (pathname.startsWith("/driver") && role !== "driver") {
    return redirectWithCookies(roleHome[role]);
  }

  if (pathname.startsWith("/investor") && role !== "investor") {
    return redirectWithCookies(roleHome[role]);
  }

  if (pathname.startsWith("/dashboard") && role !== "admin") {
    return redirectWithCookies(roleHome[role]);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
