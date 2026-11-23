export function allowMockAuth(
  mode: string | undefined,
  environment: string | undefined,
) {
  return (
    mode === 'mock' && (environment === 'development' || environment === 'test')
  );
}

export function serializeJsonLd(value: object) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function seedPassword(value: string | undefined) {
  if (!value || value.length < 16 || Buffer.byteLength(value) > 72)
    throw new Error(
      'Set ADMIN_NEW_PASSWORD to at least 16 characters and at most 72 bytes.',
    );
  return value;
}

export function supplierFeedToken(url: string, token?: string | null) {
  return (
    token ||
    (url === process.env.SUPPLIER_FEED_URL
      ? process.env.SUPPLIER_API_KEY
      : undefined)
  );
}

export function permittedAdminOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  if (origin === null) return true; // Non-browser API clients omit Origin.
  return origin === new URL(process.env.NEXTAUTH_URL || request.url).origin;
}
