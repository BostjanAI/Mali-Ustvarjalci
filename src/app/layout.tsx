import './globals.css';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { Poppins } from 'next/font/google';
import { ToastProvider } from '@/components/ui/Toast';

const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

const siteUrl = process.env.NEXTAUTH_URL || 'https://www.mali-ustvarjalci.si';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Mali Ustvarjalci',
    template: '%s | Mali Ustvarjalci',
  },
  description: 'Dropshipping web shop for creative products',
  keywords: ['creative products', 'children', 'dropshipping', 'online shop', 'mali ustvarjalci'],
  authors: [{ name: 'Mali Ustvarjalci' }],
  creator: 'Mali Ustvarjalci',
  publisher: 'Mali Ustvarjalci',
  openGraph: {
    type: 'website',
    locale: 'sl_SI',
    siteName: 'Mali Ustvarjalci',
    title: 'Mali Ustvarjalci',
    description: 'Dropshipping web shop for creative products',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: '/',
    languages: {
      'sl': '/sl',
      'en': '/en',
    },
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  verification: {
    google: 'add-your-google-verification-code',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sl">
      <body className={poppins.className}>
        <ToastProvider>
          {children}
          <Analytics />
        </ToastProvider>
      </body>
    </html>
  );
}


