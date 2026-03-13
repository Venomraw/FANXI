import { NextRequest, NextResponse } from 'next/server';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/hub',
  '/predict',
  '/profile',
  '/onboarding',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root path is always public — never redirect
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Check if the route is protected
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // For protected routes: check for refresh cookie as a signal of a session
  // The actual token verification happens server-side in the API
  // We use the presence of the cookie as a lightweight gate
  const hasRefreshCookie = request.cookies.has('refresh_token');

  if (!hasRefreshCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
