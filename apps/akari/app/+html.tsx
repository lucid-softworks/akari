import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="color-scheme" content="dark light" />
        <meta name="theme-color" content="#151718" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="akari" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        {/* iOS Safari's bottom URL bar is partly translucent and samples the
            page color under it — without an html background the bar looks
            white even when theme-color is set. */}
        {/* oxlint-disable-next-line react-doctor/rn-no-raw-text -- +html.tsx is the Expo Router web entry; CSS inside a <style> tag is never rendered on RN */}
        <style>{`
          html { color-scheme: dark light; background-color: #151718; }
          @media (prefers-color-scheme: light) {
            html { background-color: #ffffff; }
          }
        `}</style>
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
