"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { getSupportedChainId, type SupportedChainId } from "./chains";
import { usePublicClient, useWalletClient } from "wagmi";
import { getZamaSDK } from "./zama";

export function useZamaSDK(chainId?: SupportedChainId) {
  const { chainId: connectedChainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const activeChainId = chainId ?? getSupportedChainId(connectedChainId);

  return useMemo(() => {
    if (!walletClient || !publicClient) return null;
    return getZamaSDK(activeChainId, walletClient, publicClient);
  }, [activeChainId, walletClient, publicClient]);
}
