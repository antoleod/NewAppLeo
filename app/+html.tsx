import { ScrollViewStyleReset } from 'expo-router/html';

export default function RootHtml({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0f131a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/NewAppLeo/manifest.json" />
        <link rel="apple-touch-icon" href="/NewAppLeo/logo192.png" />
        <style dangerouslySetInnerHTML={{ __html: 'html,body,#root{width:100%;max-width:100%;overflow-x:hidden;overscroll-behavior-x:none;}body{touch-action:pan-y;background:#060912;}' }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
