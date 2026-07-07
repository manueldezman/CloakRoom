"use client";

import { useState } from "react";
import type { SVGProps } from "react";
import type { WrapperPair } from "@/lib/registry";
import { getChainConfig, getExplorerAddressUrl } from "@/lib/chains";
import { Badge } from "./Badge";
import { Button } from "./Button";
import { WrapUnwrapDialog } from "./WrapUnwrapDialog";
import { DecryptRow } from "./DecryptPanel";

export function PairCard({
  pair,
  onEditImportedPair,
  onRemoveImportedPair,
}: {
  pair: WrapperPair;
  onEditImportedPair?: (pair: WrapperPair) => void;
  onRemoveImportedPair?: (pair: WrapperPair) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showDecrypt, setShowDecrypt] = useState(false);
  const chain = getChainConfig(pair.chainId);
  const isImported = pair.source === "imported-local";

  return (
    <div className="h-full border border-tertiary bg-surface px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-[17px] md:text-[19px] tracking-[-0.02em] text-fg">
              {pair.tokenSymbol ?? "?"} <span className="text-tertiary">→</span> {pair.confidentialSymbol ?? "?"}
            </p>
            <Badge tone="neutral">{chain.shortLabel}</Badge>
            <Badge tone={pair.source === "official" ? "primary" : "neutral"}>
              {pair.source === "official" ? "Official" : pair.source === "custom-config" ? "Config" : "Imported"}
            </Badge>
          </div>
          <p className="mt-2 text-[14px] text-tertiary">
            {pair.tokenName ?? "Unknown token"} · {pair.label || "Registry pair"}
          </p>
        </div>

        {pair.flagged ? (
          <Badge tone="error">Needs review</Badge>
        ) : (
          <div
            className="grid h-8 w-8 place-items-center border border-tertiary bg-neutral text-tertiary"
            title="Confidential pair"
            aria-hidden="true"
          >
            <LockIcon />
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2 font-mono text-[13px] text-tertiary">
        <AddressLine
          label="ERC-20"
          address={pair.tokenAddress}
          explorerUrl={getExplorerAddressUrl(pair.chainId, pair.tokenAddress)}
        />
        <AddressLine
          label="ERC-7984"
          address={pair.confidentialTokenAddress}
          explorerUrl={getExplorerAddressUrl(pair.chainId, pair.confidentialTokenAddress)}
        />
      </div>

      {pair.flagged && (
        <p className="mt-3 text-[13px] text-error">
          This pair failed a live ERC-7984 check or its metadata could not be read.
        </p>
      )}

      {isImported && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            className="text-[13px] underline underline-offset-4 text-tertiary hover:text-fg"
            onClick={() => onEditImportedPair?.(pair)}
          >
            Edit
          </button>
          <button
            className="text-[13px] underline underline-offset-4 text-error hover:opacity-80"
            onClick={() => onRemoveImportedPair?.(pair)}
          >
            Remove
          </button>
        </div>
      )}

      {chain.faucetEnabled && (
        <p className="mt-3 text-[12px] leading-5 text-tertiary">
          Need test tokens? Use the faucet panel below, then wrap from here.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => setDialogOpen(true)} disabled={pair.flagged} className="min-w-[144px]">
          Wrap / Unwrap
        </Button>
        <Button
          variant="secondary"
          onClick={() => setShowDecrypt((v) => !v)}
          className="min-w-[110px]"
        >
          {showDecrypt ? "Hide" : "Decrypt"}
        </Button>
      </div>

      {showDecrypt && (
        <div className="mt-4">
          <DecryptRow
            tokenAddress={pair.confidentialTokenAddress}
            label={pair.confidentialName ?? "Confidential balance"}
            symbol={pair.confidentialSymbol}
            decimals={pair.confidentialDecimals ?? pair.tokenDecimals ?? 18}
          />
        </div>
      )}

      {dialogOpen && <WrapUnwrapDialog pair={pair} onClose={() => setDialogOpen(false)} />}
    </div>
  );
}

function AddressLine({
  label,
  address,
  explorerUrl,
}: {
  label: string;
  address: string;
  explorerUrl: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-tertiary bg-neutral px-3 py-2">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-tertiary">{label}</p>
        <p className="mt-1 text-fg">{shorten(address)}</p>
      </div>
      <a className="text-[13px] underline underline-offset-4 hover:opacity-70" href={explorerUrl} target="_blank" rel="noreferrer">
        View
      </a>
    </div>
  );
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" {...props}>
      <rect x="6.5" y="10.5" width="11" height="9" rx="2" />
      <path d="M8.5 10.5V8.75a3.5 3.5 0 0 1 7 0v1.75" />
    </svg>
  );
}
