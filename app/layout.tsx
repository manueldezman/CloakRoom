import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Confidential Wrapper Registry",
  description: "Browse, wrap, unwrap, and decrypt every official ERC-20 ↔ ERC-7984 pair on Sepolia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral text-on-surface">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
