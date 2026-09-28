import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const country = request.headers.get('cf-ipcountry');

  // If request passed through Cloudflare and country is not VN, block access
  if (country && country.toUpperCase() !== 'VN') {
    return new NextResponse(
      JSON.stringify({
        error: 'Forbidden',
        message: 'Access restricted: Only visitors from Vietnam (VN) are permitted.',
        country: country
      }),
      {
        status: 403,
        headers: { 'content-type': 'application/json' }
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
