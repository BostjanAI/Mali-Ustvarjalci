export const locales = ['sl', 'en'] as const;
export type Locale = (typeof locales)[number];

export async function getMessages(locale: Locale) {
  if (locale === 'en') return (await import('./messages/en.json')).default;
  return (await import('./messages/sl.json')).default;
}







