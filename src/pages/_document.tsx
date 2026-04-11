import { Html, Head, Main, NextScript } from "next/document";
import { SEOElements } from "@/components/SEO";

export default function Document() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    "name": "AMBC Club",
    "alternateName": "AMBC Bowling Club",
    "url": "https://ambc-club.vercel.app",
    "logo": "https://ambc-club.vercel.app/ambc-logo.png",
    "description": "AMBC Club adalah komuniti bowling yang aktif dengan portal ahli, galeri foto, chat rooms, sistem couple, dan banyak lagi.",
    "sport": "Bowling",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "availableLanguage": ["English", "Malay"]
    },
    "sameAs": [
      "https://facebook.com/ambcclub",
      "https://instagram.com/ambcclub"
    ],
    "potentialAction": {
      "@type": "JoinAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://ambc-club.vercel.app/signup"
      }
    }
  };

  return (
    <Html lang="en">
      <Head>
        {/* SEO Meta Tags */}
        <SEOElements />

        {/* Structured Data (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        {/* PWA Primary Color */}
        <meta name="theme-color" content="#dc2626" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f172a" />

        {/* PWA Meta Tags */}
        <meta name="application-name" content="AMBC Club" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AMBC Club" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#dc2626" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/ambc-logo.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/ambc-logo.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/ambc-logo.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/ambc-logo.png" />

        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Splash Screens for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link
          rel="apple-touch-startup-image"
          href="/ambc-logo.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />

        {/* Preconnect for Performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}