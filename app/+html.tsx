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
        <link rel="manifest" href="/NewAppLeo/manifest.json" />

        {/* PWA — iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="App Leo" />
        <link rel="apple-touch-icon" href="/NewAppLeo/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/NewAppLeo/apple-touch-icon.png" />

        {/* Favicon */}
        <link rel="icon" type="image/png" href="/NewAppLeo/favicon.png" />
        <link rel="shortcut icon" href="/NewAppLeo/favicon.ico" />

        <ScrollViewStyleReset />

        {/* Register SW immediately (before React mounts) so Chrome sees it on first load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker.register('/NewAppLeo/sw.js').catch(function () {});
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
