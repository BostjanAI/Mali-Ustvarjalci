import type { ReactNode } from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { LogoutButton } from '@/components/admin/LogoutButton';

export default async function AdminLayout({ children, params }: { children: ReactNode; params: { locale: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.user?.role;
  const locale = params.locale || 'sl';
  if (!session || role !== 'admin') redirect(`/${locale}`);
  
  const userEmail = (session as any)?.user?.email || 'Admin';
  
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <nav className="flex gap-6 text-sm font-medium">
          <Link href={`/${locale}/admin`} className="hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
          <Link href={`/${locale}/admin/suppliers`} className="hover:text-blue-600 transition-colors">
            Suppliers
          </Link>
          <Link href={`/${locale}/admin/sync-logs`} className="hover:text-blue-600 transition-colors">
            Sync Logs
          </Link>
          <Link href={`/${locale}/admin/orders`} className="hover:text-blue-600 transition-colors">
            Orders
          </Link>
          <Link href={`/${locale}/admin/products`} className="hover:text-blue-600 transition-colors">
            Products
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{userEmail}</span>
          </div>
          <LogoutButton />
        </div>
      </div>
      {children}
    </div>
  );
}







