"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { Button } from "./Button";
import { getChainConfig, isSupportedChainId, DEFAULT_CHAIN_ID } from "@/lib/chains";

export function NetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();

  if (!isConnected || isSupportedChainId(chainId)) return null;
  const target = getChainConfig(DEFAULT_CHAIN_ID);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-error/40 bg-surface px-4 py-3">
      <p className="text-[14px] leading-6 text-fg">
        Unsupported network. Switch to <strong>{target.shortLabel}</strong> to use the registry.
      </p>
      <Button
        variant="secondary"
        onClick={() => void switchChainAsync({ chainId: DEFAULT_CHAIN_ID }).catch(() => null)}
        disabled={isPending}
      >
        {isPending ? "Switching..." : `Switch to ${target.shortLabel}`}
      </Button>
    </div>
  );
}
