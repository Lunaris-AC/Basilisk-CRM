import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Basilisk Support ERP",
  description: "Plateforme de gestion de tickets, incidents et CMDB",
};

import { QueryProvider } from '@/providers/QueryProvider';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/ThemeProvider';
import Script from 'next/script';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const customTheme = localStorage.getItem('basilisk-custom-theme');
                const olympeId = localStorage.getItem('basilisk-olympe-theme');
                const root = document.documentElement;

                const hexToHSL = (hex) => {
                  let r = 0, g = 0, b = 0;
                  if (hex.length === 4) {
                      r = parseInt("0x" + hex[1] + hex[1]); g = parseInt("0x" + hex[2] + hex[2]); b = parseInt("0x" + hex[3] + hex[3]);
                  } else if (hex.length === 7) {
                      r = parseInt("0x" + hex[1] + hex[2]); g = parseInt("0x" + hex[3] + hex[4]); b = parseInt("0x" + hex[5] + hex[6]);
                  }
                  r /= 255; g /= 255; b /= 255;
                  const max = Math.max(r, g, b), min = Math.min(r, g, b);
                  let h = 0, s = 0, l = (max + min) / 2;
                  if (max !== min) {
                      const d = max - min;
                      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                      switch (max) {
                          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                          case g: h = (b - r) / d + 2; break;
                          case b: h = (r - g) / d + 4; break;
                      }
                      h /= 6;
                  }
                  return \`\${(h * 360).toFixed(1)} \${(s * 100).toFixed(1)}% \${(l * 100).toFixed(1)}%\`;
                };

                if (customTheme && customTheme !== '{}') {
                  const colors = JSON.parse(customTheme);
                  if (colors.primary) {
                    const hsl = hexToHSL(colors.primary);
                    root.style.setProperty('--primary', hsl);
                    root.style.setProperty('--ring', hsl);
                  }
                  if (colors.background) root.style.setProperty('--background', hexToHSL(colors.background));
                  if (colors.border) root.style.setProperty('--border', hexToHSL(colors.border));
                } else if (olympeId && olympeId !== 'default') {
                  const themes = {
                    "zeus": { p: "45 93% 47%", a: "200 100% 50%", m: "210 20% 90%" },
                    "hades": { p: "0 0% 15%", a: "0 100% 50%", m: "0 0% 25%" },
                    "athena": { p: "190 100% 25%", a: "45 93% 47%", m: "190 20% 90%" },
                    "poseidon": { p: "210 100% 40%", a: "170 100% 45%", m: "210 30% 85%" },
                    "ares": { p: "0 100% 30%", a: "0 0% 10%", m: "0 30% 20%" },
                    "aphrodite": { p: "330 100% 70%", a: "45 100% 80%", m: "330 20% 95%" },
                    "apollon": { p: "40 100% 50%", a: "200 100% 60%", m: "40 20% 90%" },
                    "artemis": { p: "140 100% 20%", a: "180 20% 80%", m: "140 10% 30%" },
                    "hermes": { p: "25 100% 50%", a: "200 50% 50%", m: "25 20% 90%" },
                    "dionysos": { p: "280 100% 30%", a: "100 100% 40%", m: "280 20% 90%" },
                    "hera": { p: "260 100% 20%", a: "150 100% 40%", m: "260 10% 80%" },
                    "demeter": { p: "35 100% 30%", a: "120 100% 30%", m: "35 30% 80%" },
                    "persephone": { p: "300 50% 30%", a: "120 40% 50%", m: "300 10% 20%" },
                    "chronos": { p: "0 0% 40%", a: "45 50% 30%", m: "0 0% 20%" },
                    "nyx": { p: "240 100% 5%", a: "260 100% 60%", m: "240 50% 10%" },
                    "hephaistos": { p: "20 100% 40%", a: "10 50% 20%", m: "20 20% 10%" },
                    "hestia": { p: "15 100% 50%", a: "40 100% 80%", m: "15 20% 95%" },
                    "pan": { p: "80 100% 25%", a: "40 50% 40%", m: "80 20% 90%" },
                    "atlas": { p: "200 5% 30%", a: "210 100% 95%", m: "200 10% 20%" },
                    "gaïa": { p: "120 60% 20%", a: "30 50% 40%", m: "120 20% 80%" },
                    "eros": { p: "350 100% 45%", a: "45 100% 80%", m: "350 20% 95%" },
                    "thanatos": { p: "0 0% 10%", a: "200 5% 40%", m: "0 0% 5%" },
                    "hypnos": { p: "260 50% 40%", a: "220 100% 90%", m: "260 20% 20%" },
                    "iris": { p: "180 100% 40%", a: "300 100% 60%", m: "180 20% 90%" },
                    "nike": { p: "48 100% 50%", a: "0 0% 100%", m: "48 30% 90%" },
                    "némésis": { p: "0 0% 20%", a: "0 100% 40%", m: "0 0% 40%" },
                    "hecate": { p: "280 100% 15%", a: "280 50% 80%", m: "280 30% 10%" },
                    "tyche": { p: "142 76% 36%", a: "45 100% 50%", m: "142 20% 90%" },
                    "morphee": { p: "210 50% 20%", a: "210 100% 80%", m: "210 30% 10%" },
                    "helios": { p: "45 100% 50%", a: "20 100% 50%", m: "45 30% 90%" }
                  };
                  const t = themes[olympeId];
                  if (t) {
                    root.style.setProperty('--primary', t.p);
                    root.style.setProperty('--ring', t.p);
                    root.style.setProperty('--sidebar-primary', t.p);
                    root.style.setProperty('--accent', t.a);
                    root.style.setProperty('--muted', t.m);
                  }
                }
              } catch (e) { console.error('Theme injection error:', e); }
            `
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="https://cdn-icons-png.flaticon.com/512/5169/5169557.png" />
        <link rel="shortcut icon" href="https://cdn-icons-png.flaticon.com/512/5169/5169557.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Basilisk ERP" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Basilisk ERP" />
        <meta name="msapplication-TileColor" content="#0a0a1a" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <Script src="https://meet.jit.si/external_api.js" strategy="beforeInteractive" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>{children}</QueryProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
