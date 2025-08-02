import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Hardcode the secret as a temporary workaround
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "your_secret_key";

// Public paths that don't require authentication
const publicPaths = [
  '/',
  '/auth/signin',
  '/auth/signup',
  '/auth/verify',
  '/auth/reset-password',
  '/auth/signout',
  '/api/auth',
  '/status-check',
  '/api/status-check',
];

// Function to check if the path is public
const isPublicPath = (path: string) =>
  publicPaths.some((publicPath) => path === publicPath) ||
  path.startsWith('/auth') ||
  path.startsWith('/api/auth') ||
  path.startsWith('/_next') ||
  path.startsWith('/static') ||
  path.startsWith('/images') ||
  path.startsWith('/uploads') ||
  path.startsWith('/favicon');

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  console.log(`[Middleware] Processing ${path}`);
  
  // Allow public paths without authentication
  if (isPublicPath(path)) {
    console.log(`[Middleware] Public path: ${path}, allowing access`);
    return NextResponse.next();
  }
  
  // Get the NextAuth token
  try {
    console.log(`[Middleware] Checking NextAuth token for path: ${path}`);
    
    const token = await getToken({ 
      req: request,
      secret: NEXTAUTH_SECRET
    });
    
    console.log(`[Middleware] NextAuth token found: ${!!token}`);
    
    // If no token, redirect to signin
    if (!token) {
      console.log(`[Middleware] No NextAuth token, redirecting to signin`);
      const url = new URL('/auth/signin', request.url);
      url.searchParams.set('callbackUrl', encodeURI(request.url));
      return NextResponse.redirect(url);
    }
    
    console.log(`[Middleware] User role: ${token.role}, accessing: ${path}`);
    
    // Admin routes check
    if (path.startsWith('/admin') && token.role !== 'admin') {
      console.log(`[Middleware] Non-admin user attempting to access admin route`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // Company role - add company ID header to all API requests for tenant isolation
    if (token.role === 'company' && token.companyId) {
      console.log(`[Middleware] Adding company ID header: ${token.companyId}`);
      
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-company-id', token.companyId as string);
      
      // Return a new request with the modified headers
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
    
    console.log(`[Middleware] Access granted for ${path}`);
    return NextResponse.next();
  } catch (error) {
    console.error(`[Middleware] Error processing ${path}:`, error);
    // In case of error during auth check, redirect to login
    if (!isPublicPath(path)) {
      const url = new URL('/auth/signin', request.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
}

// Configure paths for middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 