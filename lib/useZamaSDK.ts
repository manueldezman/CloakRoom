"use client";

import { useMemo } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { getZamaSDK } from "./zama";

export function useZamaSDK() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  return useMemo(() => {
    if (!walletClient || !publicClient) return null;
    return getZamaSDK(walletClient, publicClient);
  }, [walletClient, publicClient]);
}
