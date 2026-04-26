import { ScrollViewStyleReset } from 'expo-router/html';
import { getWebBasePath } from '@/lib/web';

export default function RootHtml({ children }: { children: React.ReactNode }) {
  const basePath = getWebBasePath();
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
        <link rel="manifest" href={`${basePath}/manifest.json`} />
        <link rel="apple-touch-icon" href={`${basePath}/logo192.png`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('${basePath}/sw.js',{scope:'${basePath}/'}).catch(function(error){if(location.hostname==='localhost'){console.warn('Service worker registration failed',error);}});});}`,
          }}
        />
        <style dangerouslySetInnerHTML={{ __html: 'html,body,#root{width:100%;max-width:100%;overflow-x:hidden;overscroll-behavior-x:none;}body{touch-action:pan-y;background:#060912;}' }} />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
