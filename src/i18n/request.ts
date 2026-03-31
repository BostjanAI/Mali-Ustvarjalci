import {getRequestConfig} from 'next-intl/server';

export default getRequestConfig(async (ctx: any) => {
  const supportedLocales = ['sl', 'en'] as const;
  const incomingLocale = ctx?.locale;
  const resolvedLocale = supportedLocales.includes(incomingLocale as any) ? (incomingLocale as any) : 'sl';

  return {
    locale: resolvedLocale,
    messages: (await import(`./messages/${resolvedLocale}.json`)).default
  };
});


