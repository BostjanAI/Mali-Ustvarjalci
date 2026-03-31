import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { supplierSchema } from '@/lib/schemas/supplier';
import { redirect } from 'next/navigation';

async function createSupplier(formData: FormData) {
  'use server';
  const locale = String(formData.get('locale') || 'sl');
  
  try {
    const data = {
      name: String(formData.get('name') || ''),
      feedUrl: String(formData.get('feedUrl') || ''),
      authToken: String(formData.get('authToken') || ''),
      syncFrequency: String(formData.get('syncFrequency') || ''),
      active: true,
    };

    const validated = supplierSchema.parse(data);
    
    await prisma.supplier.create({
      data: {
        name: validated.name,
        feedUrl: validated.feedUrl || null,
        authToken: validated.authToken || null,
        syncFrequency: validated.syncFrequency || null,
        active: validated.active,
      },
    });
    revalidatePath(`/${locale}/admin/suppliers`);
  } catch (error: any) {
    console.error('Create supplier error:', error);
  }
}

async function updateSupplier(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  const locale = String(formData.get('locale') || 'sl');
  
  try {
    const data = {
      name: String(formData.get('name') || ''),
      feedUrl: String(formData.get('feedUrl') || ''),
      authToken: String(formData.get('authToken') || ''),
      syncFrequency: String(formData.get('syncFrequency') || ''),
      active: String(formData.get('active') || 'true') === 'true',
    };

    const validated = supplierSchema.parse(data);
    
    await prisma.supplier.update({
      where: { id },
      data: {
        name: validated.name,
        feedUrl: validated.feedUrl || null,
        authToken: validated.authToken || null,
        syncFrequency: validated.syncFrequency || null,
        active: validated.active,
      },
    });
    revalidatePath(`/${locale}/admin/suppliers`);
  } catch (error: any) {
    console.error('Update supplier error:', error);
  }
}

async function deleteSupplier(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  const locale = String(formData.get('locale') || 'sl');
  
  try {
    await prisma.supplier.delete({ where: { id } });
    revalidatePath(`/${locale}/admin/suppliers`);
  } catch (error: any) {
    console.error('Delete supplier error:', error);
  }
}

async function syncNow(formData: FormData) {
  'use server';
  const locale = String(formData.get('locale') || 'sl');
  await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/sync-now`, { method: 'POST' });
  revalidatePath(`/${locale}/admin/suppliers`);
}

export default async function SuppliersPage({ params }: { params: { locale: string } }) {
  const locale = params.locale || 'sl';
  const suppliers = await prisma.supplier.findMany({ orderBy: { createdAt: 'desc' } });
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Suppliers</h1>
      <form action={createSupplier} className="flex gap-2 items-end flex-wrap">
        <input type="hidden" name="locale" value={locale} />
        <div>
          <label className="block text-sm">Name</label>
          <input name="name" className="border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm">Feed URL</label>
          <input name="feedUrl" className="border rounded px-2 py-1 w-96" />
        </div>
        <div>
          <label className="block text-sm">Auth Token</label>
          <input name="authToken" className="border rounded px-2 py-1 w-64" />
        </div>
        <div>
          <label className="block text-sm">Sync Frequency</label>
          <input name="syncFrequency" placeholder="cron or @daily" className="border rounded px-2 py-1 w-48" />
        </div>
        <button className="bg-brand-600 text-white px-3 py-1 rounded">Create</button>
        <form action={syncNow}>
          <input type="hidden" name="locale" value={locale} />
          <button className="ml-4 border px-3 py-1 rounded">Sync now</button>
        </form>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Name</th>
            <th>Feed URL</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <tr key={s.id} className="border-b">
              <td className="py-2">
                <form action={updateSupplier} className="flex gap-2 items-center flex-wrap">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <input name="name" defaultValue={s.name} className="border rounded px-2 py-1" />
                  <input name="feedUrl" defaultValue={s.feedUrl ?? ''} className="border rounded px-2 py-1 w-80" />
                  <input name="authToken" defaultValue={s.authToken ?? ''} className="border rounded px-2 py-1 w-64" placeholder="Auth token" />
                  <input name="syncFrequency" defaultValue={s.syncFrequency ?? ''} className="border rounded px-2 py-1 w-48" placeholder="@daily" />
                  <select name="active" defaultValue={String(s.active)} className="border rounded px-2 py-1">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  <button className="border px-3 py-1 rounded">Save</button>
                </form>
              </td>
              <td className="text-gray-600">{s.feedUrl}</td>
              <td>{s.active ? 'Yes' : 'No'}</td>
              <td>
                <form action={deleteSupplier}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <button className="text-red-600">Delete</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}







