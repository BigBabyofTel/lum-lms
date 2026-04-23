import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const hasRefreshToken = request.cookies.has('refresh_token');
  const isOnDashboard = request.nextUrl.pathname.startsWith('/dashboard');
  const isOnAuth = request.nextUrl.pathname.startsWith('/auth');

  if (isOnDashboard && !hasRefreshToken) {
    return NextResponse.redirect(new URL('/auth', request.url));
  }
  if (isOnAuth && hasRefreshToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth'],
};
