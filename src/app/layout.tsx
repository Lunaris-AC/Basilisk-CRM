import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
              } catch (e) {}
            `
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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
