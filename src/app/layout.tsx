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
                if (customTheme) {
                  const colors = JSON.parse(customTheme);
                  const root = document.documentElement;
                  
                  // Helper hexToHSL equivalent in JS
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

                  if (colors.primary) {
                    const hsl = hexToHSL(colors.primary);
                    root.style.setProperty('--primary', hsl);
                    root.style.setProperty('--ring', hsl);
                  }
                  if (colors.background) root.style.setProperty('--background', hexToHSL(colors.background));
                  if (colors.border) root.style.setProperty('--border', hexToHSL(colors.border));
                } else {
                  const olympeId = localStorage.getItem('basilisk-olympe-theme');
                  const accentId = localStorage.getItem('basilisk-accent');
                  
                  let primary, accent, muted;

                  if (olympeId && olympeId !== 'default') {
                    const themes = {
                      'zeus': { p:'45 93% 47%', a:'200 100% 50%', m:'210 20% 90%' },
                      'hades': { p:'0 0% 15%', a:'0 100% 50%', m:'0 0% 25%' },
                      'athena': { p:'190 100% 25%', a:'45 93% 47%', m:'190 20% 90%' },
                      'nyx': { p:'240 100% 5%', a:'260 100% 60%', m:'240 50% 10%' },
                      'poseidon': { p:'210 100% 40%', a:'170 100% 45%', m:'210 30% 85%' },
                      'helios': { p:'45 100% 50%', a:'20 100% 50%', m:'45 30% 90%' }
                    };
                    const t = themes[olympeId];
                    if (t) { primary = t.p; accent = t.a; muted = t.m; }
                  } else if (accentId && accentId !== 'theme-indigo') {
                    const colors = {
                      'theme-emerald': '142.1 76.2% 36.3%',
                      'theme-violet': '262.1 83.3% 57.8%',
                      'theme-orange': '24.6 95% 53.1%',
                      'theme-blue': '221.2 83.2% 53.3%'
                    };
                    primary = colors[accentId];
                  }

                  if (primary) {
                    const root = document.documentElement;
                    root.style.setProperty('--primary', primary);
                    root.style.setProperty('--ring', primary);
                    root.style.setProperty('--sidebar-primary', primary);
                    if (accent) root.style.setProperty('--accent', accent);
                    if (muted) root.style.setProperty('--muted', muted);
                  }
                }
              } catch (e) {}
            `
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0a1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Basilisk ERP" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Basilisk ERP" />
        <meta name="msapplication-TileColor" content="#0a0a1a" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
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
