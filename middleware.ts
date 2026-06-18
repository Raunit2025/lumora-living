import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if the browser has the VIP Pass cookie
  const session = request.cookies.get('lunora_admin_session');
  
  // If the user is trying to access ANY URL that starts with "/admin"
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // If they don't have the cookie, redirect them to the login page immediately
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // Otherwise, let them pass normally
  return NextResponse.next();
}

// Tell Next.js exactly which routes this bouncer should actively monitor
export const config = {
  matcher: ['/admin/:path*'],
};