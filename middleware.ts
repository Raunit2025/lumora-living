import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('lunora_admin_session');
  
  // Protect database modification routes (POST/PUT/DELETE)
  const isModifyingProducts = request.nextUrl.pathname.startsWith('/api/products') && request.method !== 'GET';
  const isModifyingOrders = request.nextUrl.pathname.startsWith('/api/orders') && request.method !== 'GET';

  if (isModifyingProducts || isModifyingOrders) {
    if (!session) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized Backend Access' }), { status: 401 });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  // Monitor the API routes instead of the UI routes
  matcher: ['/api/:path*'],
};