import { NextRequest, NextResponse } from 'next/server';

const USERNAME = process.env.BASIC_AUTH_USER || 'Tablespace';
const PASSWORD = process.env.BASIC_AUTH_PASS || 'Ramki@Altera';

export function middleware(req: NextRequest) {
  // Skip auth for Next.js internals and API routes
  // (API routes are only reachable from the authenticated page context)
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  const authHeader = req.headers.get('authorization');

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      try {
        const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
        const [user, pass] = decoded.split(':');
        if (user === USERNAME && pass === PASSWORD) {
          return NextResponse.next();
        }
      } catch {
        // fall through to 401
      }
    }
  }

  // Challenge the browser
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="TableSpace BI Suite", charset="UTF-8"',
      'Content-Type': 'text/plain',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
