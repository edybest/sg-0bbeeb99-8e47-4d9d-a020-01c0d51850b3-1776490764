import { cn } from "@/lib/utils";
import { Html, Head, Main, NextScript } from "next/document";
import { SEOElements } from "@/components/SEO";

export default function Document() {
  return (
    <Html lang="ms" suppressHydrationWarning data-scroll-behavior="smooth">
      <Head>
        <SEOElements />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Browser tab icons */}
        <link rel="icon" href="/pwa-icon.jpg" type="image/jpeg" />
        <link rel="icon" sizes="32x32" href="/pwa-icon.jpg" type="image/jpeg" />
        <link rel="icon" sizes="16x16" href="/pwa-icon.jpg" type="image/jpeg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#0ea5e9" />
        
        {/* iOS PWA Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AMBC Club" />
        <link rel="apple-touch-icon" href="/pwa-icon.jpg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/pwa-icon.jpg" />
        <link rel="apple-touch-icon" sizes="152x152" href="/pwa-icon.jpg" />
        <link rel="apple-touch-icon" sizes="120x120" href="/pwa-icon.jpg" />

        {/* Windows tiles (harmless on others) */}
        <meta name="msapplication-TileColor" content="#0ea5e9" />
        <meta name="msapplication-TileImage" content="/pwa-icon.jpg" />
        
        {/* Android PWA Support */}
        <meta name="mobile-web-app-capable" content="yes" />

        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  try {
    var p = window.location && window.location.pathname ? window.location.pathname : "";
    if (p.indexOf("/admin") === 0) {
      var link = document.querySelector('link[rel="manifest"]');
      if (link) link.setAttribute("href", "/manifest-admin.json");

      var appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (appleTitle) appleTitle.setAttribute("content", "AMBC Admin");

      var tile = document.querySelector('meta[name="msapplication-TileImage"]');
      if (tile) tile.setAttribute("content", "/pwa-icon.jpg");

      var icons = document.querySelectorAll('link[rel="apple-touch-icon"]');
      if (icons && icons.length) {
        for (var i=0;i<icons.length;i++) icons[i].setAttribute("href", "/pwa-icon.jpg");
      }
    }
  } catch(e) {}
})();`,
          }}
        />
        
        {/*
          CRITICAL: DO NOT REMOVE THIS SCRIPT
          The Softgen AI monitoring script is essential for core app functionality.
          The application will not function without it.
        */}
        <script
          src="https://cdn.softgen.ai/script.js"
          async
          data-softgen-monitoring="true"
        />
      </Head>
      <body
        className={cn(
          "min-h-screen w-full scroll-smooth bg-background text-foreground antialiased"
        )}
      >
        <Main />
        <NextScript />

        {/* Visual Editor Script */}
        {process.env.NODE_ENV === "development" && (
          <script
            src="https://cdn.softgen.dev/visual-editor.min.js"
            async
            data-softgen-visual-editor="true"
          />
        )}
      </body>
    </Html>
  );
}
