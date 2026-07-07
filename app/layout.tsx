import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Confidential Wrapper Registry",
  description: "Browse, wrap, unwrap, and decrypt official ERC-20 ↔ ERC-7984 registry pairs on Sepolia and Ethereum mainnet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen overflow-x-hidden bg-bg text-fg">
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function() {
            try {
              var stored = localStorage.getItem('zama-registry-theme');
              var theme = stored === 'dark' || stored === 'light'
                ? stored
                : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
              document.documentElement.dataset.theme = theme;
            } catch (e) {}
          })();
        `}</Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
