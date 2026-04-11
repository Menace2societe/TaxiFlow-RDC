// Dans le fichier middleware.ts
const isPublicRoute = ['/login', '/signup', '/'].includes(nextUrl.pathname);

if (!isLoggedIn && !isPublicRoute) {
  return Response.redirect(new URL('/login', nextUrl));
}
