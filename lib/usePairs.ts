"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllPairs, type ImportedPair } from "./registry";
import type { SupportedChainId } from "./chains";

export function usePairs(chainId: SupportedChainId, importedPairs: ImportedPair[]) {
  return useQuery({
    queryKey: ["wrapper-pairs", chainId, JSON.stringify(importedPairs)],
    queryFn: () => fetchAllPairs(chainId, importedPairs),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
