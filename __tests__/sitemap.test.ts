jest.mock('@/lib/prisma', () => ({
  prisma: { product: { findMany: jest.fn().mockResolvedValue([]) } },
}));
import sitemap from '@/app/sitemap';

describe('sitemap', () => {
  it('returns sitemap entries including shop', async () => {
    const entries = await sitemap();
    expect(entries).toBeDefined();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some((e) => e.url.includes('/shop'))).toBe(true);
  });
});
