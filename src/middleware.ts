import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/lib/routes";
import type { Database, UserRole } from "@/lib/supabase/types";

const protectedPrefixes = ["/dashboard", "/driver", "/investor"] as const;
const authPrefixes = [ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.SIGNUP] as const;

const roleHome: Record<UserRole, string> = {
  driver: ROUTES.DRIVER_PORTAL,
  investor: ROUTES.INVESTOR_DASHBOARD,
  admin: ROUTES.DASHBOARD_OVERVIEW
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isAuth = authPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  // 1. Non authentifié sur une page protégée -> Connexion
  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ROUTES.LOGIN;
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Non authentifié sur page publique
  if (!user) {
    return supabaseResponse;
  }

  // 3. Récupération du rôle
  let { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!profile && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabaseAdmin = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    const { data: adminProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (adminProfile) profile = adminProfile;
  }

  const role = profile?.role as UserRole | undefined;

  // Si aucun rôle trouvé, on laisse filer pour éviter le blocage
  if (!role || !roleHome[role]) {
    return supabaseResponse;
  }

  const targetHome = roleHome[role];

  // 4. Si déjà connecté sur une page d'auth -> redirection vers son espace
  if (isAuth) {
    return NextResponse.redirect(new URL(targetHome, request.url));
  }

  // 5. PROTECTION ABSOLUE CONTRE LES BOUCLES :
  // Si l'URL actuelle correspond déjà ou commence par la section légitime de son rôle, ON LAISSE PASSER.
  if (pathname.startsWith("/driver") && role === "driver") return supabaseResponse;
  if (pathname.startsWith("/investor") && role === "investor") return supabaseResponse;
  if (pathname.startsWith("/dashboard") && role === "admin") return supabaseResponse;

  // 6. Si l'utilisateur tente d'accéder à une section qui n'est pas la sienne
  if (isProtected) {
    return NextResponse.redirect(new URL(targetHome, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/webpack|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?|css|js|map|txt|xml|json)).*)"]
};