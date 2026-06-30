import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROUTES } from "@/lib/routes";
import type { Database, UserRole } from "@/lib/supabase/types";

const protectedPrefixes = ["/dashboard", "/driver", "/investor"] as const;
const authPrefixes = [ROUTES.LOGIN, ROUTES.REGISTER, ROUTES.SIGNUP] as const;

const roleHome: Record<UserRole, string> = {
  driver: ROUTES.DRIVER_PORTAL, // ex: /driver/dashboard ou /driver
  investor: ROUTES.INVESTOR_DASHBOARD, // ex: /investor/dashboard
  admin: ROUTES.DASHBOARD_OVERVIEW // ex: /dashboard/overview
};

// Fonction utilitaire pour nettoyer et comparer strictement les routes
function cleanPath(path: string): string {
  return path.toLowerCase().replace(/\/+$/, "").trim();
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError && process.env.NODE_ENV === "development") {
    console.warn("[middleware] getUser:", userError.message);
  }

  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isAuth = authPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  // 1. Non authentifié sur une page protégée -> Redirection Login
  if (isProtected && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ROUTES.LOGIN;
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 2. Non authentifié sur une page publique -> On laisse passer
  if (!user) {
    return supabaseResponse;
  }

  // 3. Récupération du profil
  let { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  // Sécurité Service Role si la requête standard échoue
  if (profileError && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabaseAdmin = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    const { data: adminProfile, error: adminError } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
    if (!adminError) {
      profile = adminProfile;
    }
  }

  const role = (profile as { role?: UserRole } | null)?.role;

  // Si l'utilisateur est connecté mais n'a pas de rôle valide, on ne bloque pas dans une boucle
  if (!role) {
    return supabaseResponse;
  }

  // Fonction de redirection sécurisée contre les boucles infinies
  const redirectWithCookies = (targetPath: string) => {
    if (cleanPath(pathname) === cleanPath(targetPath)) {
      return supabaseResponse;
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = targetPath;
    redirectUrl.search = "";
    const redirectResp = NextResponse.redirect(redirectUrl, 303);

    supabaseResponse.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        redirectResp.headers.append(key, value);
      }
    });

    return redirectResp;
  };

  // 4. Déjà connecté et tente d'aller sur Login/Register -> Espace personnel
  if (isAuth) {
    return redirectWithCookies(roleHome[role]);
  }

  // 5. Redirection des racines vers les sous-pages spécifiques
  if (pathname === "/dashboard" || pathname === "/driver" || pathname === "/investor") {
    return redirectWithCookies(roleHome[role]);
  }

  // 6. Vérification stricte des accès par préfixe de rôle
  // AJOUT SÉCURITÉ : Si l'utilisateur est sur la bonne section (ex: /investor/...) et que son rôle est bien 'investor', on valide IMMÉDIATEMENT sans rediriger.
  if (pathname.startsWith("/driver")) {
    if (role === "driver") return supabaseResponse;
    return redirectWithCookies(roleHome[role]);
  }

  if (pathname.startsWith("/investor")) {
    if (role === "investor") return supabaseResponse;
    return redirectWithCookies(roleHome[role]);
  }

  if (pathname.startsWith("/dashboard")) {
    if (role === "admin") return supabaseResponse;
    return redirectWithCookies(roleHome[role]);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/webpack|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg|woff2?|css|js|map|txt|xml|json)).*)"]
};