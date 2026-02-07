import './globals.css';
import Script from 'next/script';

export const metadata = {
  title: 'KoraLink',
  description: 'كوّن فريقك، ادعو لاعبين بالـID، وتحدّى فرق أخرى في مباريات الخماسي (5 + حارس).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#39ff88" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* AdSense Verification / Loader */}
        <Script
          async
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8629257406596548"
          crossOrigin="anonymous"
        />
      </head>

      <body>
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
