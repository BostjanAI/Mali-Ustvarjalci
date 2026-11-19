import './globals.css';
import './modern.css';
import localFont from 'next/font/local';
const manrope = localFont({ src: '../../public/fonts/Manrope-Variable.ttf', variable: '--font-manrope', weight: '200 800', display: 'swap' });
import type { Metadata, Viewport } from 'next';
import ConsentAnalytics from '@/components/ConsentAnalytics';

import { ToastProvider } from '@/components/ui/Toast';


const siteUrl = process.env.NEXTAUTH_URL || 'https://www.mali-ustvarjalci.si';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Mali Ustvarjalci',
    template: '%s | Mali Ustvarjalci',
  },
  description: 'Ustvarjalne igrače, lesene igrače in likovni pripomočki za male roke in velike ideje.',
  keywords: ['ustvarjalne igrače', 'lesene igrače', 'likovni material', 'igrače za otroke', 'mali ustvarjalci'],
  authors: [{ name: 'Mali Ustvarjalci' }],
  creator: 'Mali Ustvarjalci',
  publisher: 'Mali Ustvarjalci',
  openGraph: {
    type: 'website',
    locale: 'sl_SI',
    siteName: 'Mali Ustvarjalci',
    title: 'Mali Ustvarjalci',
    description: 'Mali svet velikih idej. Igrače in ustvarjalni pripomočki za otroška odkritja.',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: process.env.NEXT_PUBLIC_MOCK_MODE !== 'true',
    follow: true,
  },
  alternates: {
    canonical: '/',
    languages: {
      'sl': '/sl',
      'en': '/en',
    },
  },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sl">
      <body className={manrope.variable}>
        <ToastProvider>
          {children}
          <ConsentAnalytics />
        </ToastProvider>
      </body>
    </html>
  );
}


