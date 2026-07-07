"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { sepolia } from "wagmi/chains";
import { Button } from "./Button";

export function NetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === sepolia.id) return null;

  return (
    <div className="flex items-center justify-between rounded-md border border-error bg-white px-md py-sm mb-md">
      <p className="text-body-md">
        Wrong network. This app only works on <strong>Sepolia</strong>.
      </p>
      <Button
        variant="secondary"
        onClick={() => switchChain({ chainId: sepolia.id })}
        disabled={isPending}
      >
        {isPending ? "Switching…" : "Switch to Sepolia"}
      </Button>
    </div>
  );
}
