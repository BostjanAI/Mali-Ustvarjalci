import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { productSchema, productImageSchema } from '@/lib/schemas/product';

async function updateProduct(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  const locale = String(formData.get('locale') || 'sl');
  
  try {
    const data = {
      title: String(formData.get('title') || ''),
      priceCents: parseInt(String(formData.get('priceCents') || '0'), 10),
      active: String(formData.get('active') || 'true') === 'true',
      supplierManaged: String(formData.get('supplierManaged') || 'true') === 'true',
    };

    const validated = productSchema.parse(data);
    
    await prisma.product.update({
      where: { id },
      data: {
        title: validated.title,
        priceCents: validated.priceCents,
        active: validated.active,
        supplierManaged: validated.supplierManaged,
      },
    });
    revalidatePath(`/${locale}/admin/products`);
  } catch (error: any) {
    console.error('Update product error:', error);
  }
}

async function addImage(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  const locale = String(formData.get('locale') || 'sl');
  const url = String(formData.get('url') || '');
  
  try {
    const validated = productImageSchema.parse({ url });
    
    const p = await prisma.product.findUnique({ where: { id }, select: { imagesJson: true } });
    const images = p?.imagesJson ? (JSON.parse(p.imagesJson) as string[]) : [];
    if (!images.includes(validated.url)) images.push(validated.url);
    await prisma.product.update({ where: { id }, data: { imagesJson: JSON.stringify(images) } });
    revalidatePath(`/${locale}/admin/products`);
  } catch (error: any) {
    console.error('Add image error:', error);
  }
}

async function clearImages(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  const locale = String(formData.get('locale') || 'sl');
  
  try {
    await prisma.product.update({ where: { id }, data: { imagesJson: null } });
    revalidatePath(`/${locale}/admin/products`);
  } catch (error: any) {
    console.error('Clear images error:', error);
  }
}

export default async function AdminProductsPage({ params }: { params: { locale: string } }) {
  const locale = params.locale || 'sl';
  const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Products</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Title</th>
            <th>Price</th>
            <th>Active</th>
            <th>Supplier-managed</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2">
                <form action={updateProduct} className="flex gap-2 items-center flex-wrap">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="locale" value={locale} />
                  <input name="title" defaultValue={p.title} className="border rounded px-2 py-1 w-64" />
                  <input name="priceCents" defaultValue={String(p.priceCents)} className="border rounded px-2 py-1 w-28" />
                  <select name="active" defaultValue={String(p.active)} className="border rounded px-2 py-1">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  <select name="supplierManaged" defaultValue={String(p.supplierManaged)} className="border rounded px-2 py-1">
                    <option value="true">Supplier</option>
                    <option value="false">Local</option>
                  </select>
                  <button className="border px-3 py-1 rounded">Save</button>
                </form>
                <div className="text-xs text-gray-600 mt-2">Images: {(p as any).imagesJson || '[]'}</div>
                <div className="flex items-center gap-2 mt-2">
                  <form action={addImage} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <input name="url" placeholder="https://..." className="border rounded px-2 py-1 w-72" />
                    <button className="border px-3 py-1 rounded">Add image</button>
                  </form>
                  <form action={clearImages}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <button className="text-red-600">Clear images</button>
                  </form>
                </div>
              </td>
              <td>€{(p.priceCents / 100).toFixed(2)}</td>
              <td>{p.active ? 'Yes' : 'No'}</td>
              <td>{p.supplierManaged ? 'Yes' : 'No'}</td>
              <td></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


