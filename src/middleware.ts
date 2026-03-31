import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import intlConfig from '../next-intl.config';

const intlMiddleware = createMiddleware(intlConfig);

export default function middleware(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200 });
  }
  
  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!_next|.*\..*).*)'],
};



