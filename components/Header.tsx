"use client";

import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Header() {
  return (
    <header className="flex items-center justify-between py-sm">
      <div className="flex items-center gap-3">
        <Image src="/logos/z-square-black.svg" alt="" width={28} height={28} />
        <span className="font-display text-headline-sm">Confidential Wrapper Registry</span>
      </div>
      <ConnectButton showBalance={false} />
    </header>
  );
}
