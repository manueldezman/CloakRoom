"use client";

import { useState } from "react";
import type { ButtonHTMLAttributes, ReactNode, SVGProps } from "react";
import type { WrapperPair } from "@/lib/registry";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { FaucetButton } from "./FaucetButton";
import { WrapUnwrapDialog } from "./WrapUnwrapDialog";
import { DecryptRow } from "./DecryptPanel";

export function PairCard({ pair }: { pair: WrapperPair }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showDecrypt, setShowDecrypt] = useState(false);
  const [walletStatus, setWalletStatus] = useState("");

  async function watchAsset(address: `0x${string}`, symbol?: string | null, decimals?: number | null) {
    const ethereum = (window as Window & {
      ethereum?: { request: (args: { method: string; params?: unknown }) => Promise<unknown> };
    }).ethereum;

    if (!ethereum || !symbol || decimals == null) {
      setWalletStatus("Wallet add is unavailable for this token.");
      return;
    }

    try {
      const added = await ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address,
            symbol,
            decimals,
          },
        },
      });

      setWalletStatus(added ? `Added ${symbol} to wallet.` : `Wallet did not add ${symbol}.`);
    } catch (err: any) {
      setWalletStatus(err?.message ?? "Couldn't add token to wallet.");
    }
  }

  return (
    <div className="rounded-md border border-tertiary bg-surface p-md flex flex-col gap-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-headline-sm font-display">
            {pair.tokenSymbol ?? "?"} → {pair.confidentialSymbol ?? "?"}
          </p>
          <p className="text-body-sm text-tertiary">
            {pair.tokenName ?? "Unknown token"} · {pair.label || "Registry pair"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={pair.source === "official" ? "primary" : "neutral"}>
            {pair.source === "official" ? "Official" : "Custom"}
          </Badge>
          {pair.flagged && <Badge tone="error">⚠ Needs review</Badge>}
        </div>
      </div>

      <div className="flex flex-col gap-2 text-body-sm text-tertiary font-mono">
        <div className="flex items-center gap-2">
          <span>ERC-20: {shorten(pair.tokenAddress)}</span>
          <IconButton
            label={`Add ${pair.tokenSymbol ?? "ERC-20"} to wallet`}
            title={`Add ${pair.tokenSymbol ?? "ERC-20"} to wallet`}
            className="h-7 w-7"
            onClick={() => watchAsset(pair.tokenAddress, pair.tokenSymbol, pair.tokenDecimals)}
          >
            <WalletIcon />
          </IconButton>
        </div>
        <div className="flex items-center gap-2">
          <span>ERC-7984: {shorten(pair.confidentialTokenAddress)}</span>
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-tertiary opacity-50"
            title="Standard wallets may not support adding confidential tokens from this contract."
            aria-label="Confidential token wallet add unsupported"
          >
            <WalletOffIcon />
          </span>
        </div>
      </div>
      {walletStatus && <p className="text-body-sm text-tertiary">{walletStatus}</p>}

      {pair.flagged && (
        <p className="text-body-sm text-error">
          This pair failed a live ERC-7984 check or its metadata couldn't be read. Proceed with
          caution — it may be a stale, revoked, or malformed entry.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <FaucetButton
          tokenAddress={pair.tokenAddress}
          tokenSymbol={pair.tokenSymbol}
          tokenDecimals={pair.tokenDecimals}
        />
        <Button onClick={() => setDialogOpen(true)} disabled={pair.flagged}>
          Wrap / Unwrap
        </Button>
        <IconButton
          label={showDecrypt ? "Hide decrypted balance" : "Decrypt balance"}
          title={showDecrypt ? "Hide decrypted balance" : "Decrypt balance"}
          onClick={() => setShowDecrypt((v) => !v)}
        >
          {showDecrypt ? <EyeOffIcon /> : <EyeIcon />}
        </IconButton>
      </div>

      {showDecrypt && (
        <DecryptRow
          tokenAddress={pair.confidentialTokenAddress}
          label={pair.confidentialName ?? "Confidential balance"}
          symbol={pair.confidentialSymbol}
          decimals={pair.confidentialDecimals ?? pair.tokenDecimals ?? 18}
        />
      )}

      {dialogOpen && <WrapUnwrapDialog pair={pair} onClose={() => setDialogOpen(false)} />}
    </div>
  );
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function IconButton({
  children,
  label,
  title,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
  title: string;
}) {
  return (
    <Button
      variant="secondary"
      aria-label={label}
      title={title}
      className={`h-9 w-9 p-0 ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
}

function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" {...props}>
      <path d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h11.25A2.25 2.25 0 0 1 19.5 7.5v9A2.25 2.25 0 0 1 17.25 18.75H6A2.25 2.25 0 0 1 3.75 16.5z" />
      <path d="M15.75 12h4.5v3h-4.5a1.5 1.5 0 0 1 0-3z" />
      <path d="M7.5 8.25h6" />
    </svg>
  );
}

function WalletOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" {...props}>
      <path d="M3 3l18 18" />
      <path d="M3.75 7.5A2.25 2.25 0 0 1 6 5.25h9.75" />
      <path d="M19.5 9.75v6.75A2.25 2.25 0 0 1 17.25 18.75H6A2.25 2.25 0 0 1 3.75 16.5z" />
      <path d="M15.75 12h4.5v3h-1.5" />
    </svg>
  );
}

function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" {...props}>
      <path d="M2.25 12s3.75-6 9.75-6 9.75 6 9.75 6-3.75 6-9.75 6-9.75-6-9.75-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" {...props}>
      <path d="M3 3l18 18" />
      <path d="M10.58 10.58A2 2 0 0 0 12 16a2 2 0 0 0 1.42-.58" />
      <path d="M6.53 6.53C4.58 7.82 3.18 10 2.25 12c0 0 3.75 6 9.75 6 2.03 0 3.82-.69 5.31-1.68" />
      <path d="M14.92 9.08A9.9 9.9 0 0 1 21.75 12s-1.1 1.76-3.13 3.4" />
    </svg>
  );
}
