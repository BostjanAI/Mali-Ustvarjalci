import {
  allowMockAuth,
  seedPassword,
  serializeJsonLd,
} from '../src/lib/security';

test('test authentication requires an explicit non-production environment', () => {
  expect(allowMockAuth('mock', 'production')).toBe(false);
  expect(allowMockAuth('mock', undefined)).toBe(false);
  expect(allowMockAuth('mock', 'development')).toBe(true);
  expect(allowMockAuth('credentials', 'test')).toBe(false);
});

test('product metadata stays inside JSON text and round-trips', () => {
  const product = { name: 'A < B', description: '</script>' };
  const encoded = serializeJsonLd(product);
  expect(encoded).not.toContain('<');
  expect(JSON.parse(encoded)).toEqual(product);
});

test('administrator seed requires an explicit bcrypt-compatible password', () => {
  expect(() => seedPassword(undefined)).toThrow();
  expect(() => seedPassword('short')).toThrow();
  expect(() => seedPassword('č'.repeat(37))).toThrow();
  expect(seedPassword('a'.repeat(32))).toHaveLength(32);
});

import { permittedAdminOrigin, supplierFeedToken } from '../src/lib/security';
test('browser admin requests reject foreign and opaque origins', () => {
  const url = process.env.NEXTAUTH_URL || 'https://store.invalid';
  expect(
    permittedAdminOrigin(
      new Request(url, { headers: { Origin: new URL(url).origin } }),
    ),
  ).toBe(true);
  for (const origin of ['null', 'https://other.invalid']) {
    expect(
      permittedAdminOrigin(new Request(url, { headers: { Origin: origin } })),
    ).toBe(false);
  }
});
test('a supplier receives only credentials intended for its feed', () => {
  const previous = process.env;
  process.env = {
    ...previous,
    SUPPLIER_FEED_URL: 'https://supplier.invalid/catalog',
    SUPPLIER_API_KEY: 'fixture',
  };
  try {
    expect(supplierFeedToken('https://other.invalid')).toBeUndefined();
    expect(supplierFeedToken('https://other.invalid', 'specific')).toBe(
      'specific',
    );
    expect(supplierFeedToken('https://supplier.invalid/catalog')).toBe(
      'fixture',
    );
  } finally {
    process.env = previous;
  }
});

import { rateLimit } from '../src/lib/rateLimit';
test('rate limiter bounds memory and frees expired buckets', () => {
  jest.useFakeTimers();
  try {
    for (let i = 0; i < 50000; i++)
      expect(rateLimit('capacity-' + i, 1, 60000)).toBe(true);
    expect(rateLimit('additional', 1, 60000)).toBe(false);
    jest.advanceTimersByTime(60001);
    expect(rateLimit('additional', 1, 60000)).toBe(true);
  } finally {
    jest.useRealTimers();
  }
});
