import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* PWA — Android Chrome */}
        <meta name="theme-color" content="#0D1117" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/NewAppLeo/manifest.json?v=4" />

        {/* PWA — iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BabyFlow" />
        <link rel="apple-touch-icon" href="/NewAppLeo/apple-touch-icon.png?v=4" />
        <link rel="apple-touch-icon" sizes="180x180" href="/NewAppLeo/apple-touch-icon.png?v=4" />

        {/* Favicon */}
        <link rel="icon" type="image/png" href="/NewAppLeo/favicon.png?v=4" />
        <link rel="shortcut icon" href="/NewAppLeo/favicon.png?v=4" />

        <ScrollViewStyleReset />

        {/* Capture beforeinstallprompt before React mounts — fires once at page load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__pwaInstallPrompt = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__pwaInstallPrompt = e;
              });
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/NewAppLeo/sw.js?v=4').catch(function () {});
                });
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
