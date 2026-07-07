"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupportedChainId } from "./chains";
import type { ImportedPair } from "./registry";

const STORAGE_KEY = "zama-registry-imported-pairs";

function readPairs(): ImportedPair[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (pair): pair is ImportedPair =>
        typeof pair?.tokenAddress === "string" &&
        typeof pair?.confidentialTokenAddress === "string" &&
        typeof pair?.chainId === "number"
    );
  } catch {
    return [];
  }
}

export function useImportedPairs(activeChainId: SupportedChainId) {
  const [pairs, setPairs] = useState<ImportedPair[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPairs(readPairs());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pairs));
    } catch {
      // Ignore storage failures; the in-memory list still works for this session.
    }
  }, [hydrated, pairs]);

  const activePairs = useMemo(
    () => pairs.filter((pair) => pair.chainId === activeChainId),
    [activeChainId, pairs]
  );

  function savePair(input: ImportedPair, originalTokenAddress?: `0x${string}`) {
    setPairs((current) => {
      const normalized = {
        ...input,
        tokenAddress: input.tokenAddress as `0x${string}`,
        confidentialTokenAddress: input.confidentialTokenAddress as `0x${string}`,
      };

      const filtered = current.filter((pair) => {
        if (pair.chainId !== normalized.chainId) return true;
        const sameOriginal =
          originalTokenAddress &&
          pair.tokenAddress.toLowerCase() === originalTokenAddress.toLowerCase() &&
          pair.chainId === normalized.chainId;
        const sameTarget = pair.tokenAddress.toLowerCase() === normalized.tokenAddress.toLowerCase();
        return !(sameOriginal || sameTarget);
      });

      return [...filtered, normalized];
    });
  }

  function removePair(chainId: SupportedChainId, tokenAddress: `0x${string}`) {
    setPairs((current) =>
      current.filter(
        (pair) => !(pair.chainId === chainId && pair.tokenAddress.toLowerCase() === tokenAddress.toLowerCase())
      )
    );
  }

  return { pairs, activePairs, savePair, removePair };
}
