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
  const pathname = request.nextUrl.pathname;
  console.log(`\n[MIDDLEWARE] Handling request for: ${pathname}`);
  
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
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  console.log("[MIDDLEWARE] User check:", user ? `Logged in as ${user.id}` : "Not logged in");
  if (userError) console.log("[MIDDLEWARE] User error:", userError.message);

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isAuth = authPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !user) {
    console.log("[MIDDLEWARE] Protected route and no user. Redirecting to /login.");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (!user) {
    console.log("[MIDDLEWARE] No user, allowing public access.");
    return supabaseResponse;
  }

  let { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  console.log("[MIDDLEWARE] Normal Profile fetch:", profile, "Error:", profileError?.message);

  if (profileError && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("[MIDDLEWARE] Normal fetch failed. Using service_role_key...");
    const supabaseAdmin = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
      
    console.log("[MIDDLEWARE] Admin Profile fetch:", adminProfile, "Error:", adminError?.message);
    profile = adminProfile;
  }

  const role = (profile as any)?.role;
  console.log("[MIDDLEWARE] Final Role:", role);

  if (!role) {
    console.log("[MIDDLEWARE] No role found. Letting layout handle or returning response.");
    return supabaseResponse;
  }

  const redirectWithCookies = (targetPath: string) => {
    console.log(`[MIDDLEWARE] Redirecting to ${targetPath} with cookies...`);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = targetPath;
    redirectUrl.search = "";
    // Enforce 303 redirect as requested by user
    const redirectResp = NextResponse.redirect(redirectUrl, 303);
    
    supabaseResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        redirectResp.headers.append(key, value);
      }
    });
    
    return redirectResp;
  };

  if (isAuth) {
    console.log("[MIDDLEWARE] Logged in user accessing auth page. Redirecting to home.");
    return redirectWithCookies((roleHome as any)[role]);
  }

  if (pathname === "/dashboard" || pathname === "/driver" || pathname === "/investor") {
    console.log(`[MIDDLEWARE] Root path ${pathname} accessed. Redirecting to specific home.`);
    return redirectWithCookies((roleHome as any)[role]);
  }

  if (pathname.startsWith("/driver") && role !== "driver") {
    console.log("[MIDDLEWARE] Non-driver accessing driver route. Redirecting.");
    return redirectWithCookies((roleHome as any)[role]);
  }

  if (pathname.startsWith("/investor") && role !== "investor") {
    console.log("[MIDDLEWARE] Non-investor accessing investor route. Redirecting.");
    return redirectWithCookies((roleHome as any)[role]);
  }

  if (pathname.startsWith("/dashboard") && role !== "admin") {
    console.log("[MIDDLEWARE] Non-admin accessing admin route. Redirecting.");
    return redirectWithCookies((roleHome as any)[role]);
  }

  console.log("[MIDDLEWARE] Access granted to:", pathname);
  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
