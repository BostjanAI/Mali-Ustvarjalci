import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { prisma } from '@/lib/prisma';
import { Package, ShoppingCart, Users, TrendingUp } from 'lucide-react';

export default async function AdminPage({ params }: { params: { locale: string } }) {
  const locale = params.locale || 'sl';
  const t = await getTranslations();
  
  const [suppliersCount, ordersCount, productsCount, recentOrders] = await Promise.all([
    prisma.supplier.count(),
    prisma.order.count(),
    prisma.product.count(),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  const pendingOrders = await prisma.order.count({ where: { status: 'pending' } });
  const totalRevenueCents = await prisma.order.aggregate({
    _sum: { totalCents: true },
    where: { status: { in: ['paid', 'completed'] } },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('admin.dashboard')}</h1>
        <p className="text-gray-600 mt-1">Overview of your store</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-blue-900">{t('admin.suppliers')}</h2>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-4xl font-bold text-blue-700 mb-2">{suppliersCount}</p>
          <Link href={`/${locale}/admin/suppliers`} className="text-sm text-blue-700 hover:text-blue-800 font-medium">
            {t('admin.manageSuppliers')} →
          </Link>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-green-900">{t('admin.orders')}</h2>
            <ShoppingCart className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-4xl font-bold text-green-700 mb-2">{ordersCount}</p>
          <Link href={`/${locale}/admin/orders`} className="text-sm text-green-700 hover:text-green-800 font-medium">
            {t('admin.viewOrders')} →
          </Link>
          {pendingOrders > 0 && (
            <p className="text-xs text-green-700 mt-2">{pendingOrders} pending</p>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-purple-900">{t('admin.products')}</h2>
            <Package className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-4xl font-bold text-purple-700 mb-2">{productsCount}</p>
          <Link href={`/${locale}/admin/products`} className="text-sm text-purple-700 hover:text-purple-800 font-medium">
            Manage products →
          </Link>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-orange-900">Revenue</h2>
            <TrendingUp className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-4xl font-bold text-orange-700 mb-2">
            €{((totalRevenueCents._sum.totalCents || 0) / 100).toFixed(2)}
          </p>
          <p className="text-sm text-orange-700">Total sales</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
        {recentOrders.length === 0 ? (
          <p className="text-gray-500 text-sm">No orders yet</p>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div>
                  <p className="font-medium text-sm">{order.email}</p>
                  <p className="text-xs text-gray-500">{order.createdAt.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold">€{(order.totalCents / 100).toFixed(2)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    order.status === 'paid' ? 'bg-green-100 text-green-700' :
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link href={`/${locale}/admin/orders`} className="inline-block mt-4 text-sm text-brand-600 hover:text-brand-700 font-medium">
          View all orders →
        </Link>
      </div>

      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href={`/${locale}/admin/suppliers`} className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center font-medium">
            {t('admin.manageSuppliers')}
          </Link>
          <Link href={`/${locale}/admin/orders`} className="bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 transition-colors text-center font-medium">
            {t('admin.viewOrders')}
          </Link>
          <Link href={`/${locale}/admin/sync-logs`} className="bg-gray-600 text-white px-5 py-3 rounded-lg hover:bg-gray-700 transition-colors text-center font-medium">
            {t('admin.syncLogs')}
          </Link>
        </div>
      </div>
    </div>
  );
}


