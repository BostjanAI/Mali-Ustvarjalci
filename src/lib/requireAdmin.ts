import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    (session.user as { role?: string } | undefined)?.role !== 'admin'
  )
    throw new Error('Unauthorized');
  return session;
}
