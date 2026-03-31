import { prisma } from '@/lib/prisma';
import { forwardOrderToSupplier } from '@/lib/supplierForward';
import { revalidatePath } from 'next/cache';
import { formatCurrencyCents } from '@/lib/i18n';
import { redirect } from 'next/navigation';

async function retryForward(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  const locale = String(formData.get('locale') || 'sl');
  
  try {
    await forwardOrderToSupplier(id);
    revalidatePath(`/${locale}/admin/orders`);
  } catch (error: any) {
    console.error('Retry forward error:', error);
  }
}

async function refundOrder(formData: FormData) {
  'use server';
  const orderId = String(formData.get('orderId'));
  const locale = String(formData.get('locale') || 'sl');
  
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Refund failed');
    }
    
    revalidatePath(`/${locale}/admin/orders`);
  } catch (error: any) {
    console.error('Refund error:', error);
  }
}

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { status?: string; search?: string };
}) {
  const locale = params.locale || 'sl';
  const statusFilter = searchParams.status;
  const searchQuery = searchParams.search?.trim();

  const where: any = {};
  if (statusFilter && statusFilter !== 'all') {
    where.status = statusFilter;
  }
  if (searchQuery) {
    where.OR = [
      { email: { contains: searchQuery, mode: 'insensitive' } },
      { id: { contains: searchQuery, mode: 'insensitive' } },
    ];
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const statusCounts = await prisma.order.groupBy({
    by: ['status'],
    _count: { status: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="text-sm text-gray-600">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex gap-2 flex-wrap">
          <FilterButton href={`/${locale}/admin/orders`} active={!statusFilter || statusFilter === 'all'}>
            All ({statusCounts.reduce((sum, s) => sum + s._count.status, 0)})
          </FilterButton>
          {statusCounts.map((s) => (
            <FilterButton
              key={s.status}
              href={`/${locale}/admin/orders?status=${s.status}`}
              active={statusFilter === s.status}
            >
              {s.status} ({s._count.status})
            </FilterButton>
          ))}
        </div>

        <form method="GET" className="flex gap-2">
          <input type="hidden" name="status" value={statusFilter || 'all'} />
          <input
            type="search"
            name="search"
            defaultValue={searchQuery}
            placeholder="Search by email or order ID..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors text-sm">
            Search
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left border-b">
              <th className="py-3 px-4 font-semibold">Created</th>
              <th className="py-3 px-4 font-semibold">Email</th>
              <th className="py-3 px-4 font-semibold">Total</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Supplier</th>
              <th className="py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500">
                  No orders found
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 text-gray-600">
                    {new Date(o.createdAt).toLocaleDateString('sl-SI', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4">{o.email}</td>
                  <td className="py-3 px-4 font-semibold">{formatCurrencyCents(o.totalCents, 'sl-SI')}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        o.status === 'paid' || o.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : o.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : o.status === 'cancelled'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {o.supplierStatus ? (
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          o.supplierStatus === 'forwarded' || o.supplierStatus === 'completed'
                            ? 'bg-blue-100 text-blue-700'
                            : o.supplierStatus === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {o.supplierStatus}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <form action={retryForward}>
                        <input type="hidden" name="id" value={o.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <button className="border border-blue-300 text-blue-700 px-3 py-1 rounded hover:bg-blue-50 transition-colors text-xs">
                          Retry
                        </button>
                      </form>
                      <form action={refundOrder}>
                        <input type="hidden" name="orderId" value={o.id} />
                        <input type="hidden" name="locale" value={locale} />
                        <button className="border border-red-300 text-red-700 px-3 py-1 rounded hover:bg-red-50 transition-colors text-xs">
                          Refund
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterButton({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-brand-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </a>
  );
}







