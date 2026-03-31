import nextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { NextApiRequest, NextApiResponse } from 'next';
import { rateLimit } from '@/lib/rateLimit';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'local';
  const key = `auth:${ip}`;
  if (req.method === 'POST') {
    const ok = rateLimit(key, 10, 60_000);
    if (!ok) return res.status(429).send('Too Many Requests');
  }
  return nextAuth(req, res, authOptions);
}


