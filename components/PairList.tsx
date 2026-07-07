"use client";

import { useRef } from "react";
import type { ImportedPair, WrapperPair } from "@/lib/registry";
import { usePairs } from "@/lib/usePairs";
import { PairCard } from "./PairCard";
import type { SupportedChainId } from "@/lib/chains";

export function PairList({
  chainId,
  importedPairs,
  onEditImportedPair,
  onRemoveImportedPair,
}: {
  chainId: SupportedChainId;
  importedPairs: ImportedPair[];
  onEditImportedPair?: (pair: WrapperPair) => void;
  onRemoveImportedPair?: (pair: WrapperPair) => void;
}) {
  const { data: pairs, isLoading, isError, refetch } = usePairs(chainId, importedPairs);
  const railRef = useRef<HTMLDivElement>(null);

  function scrollRail(direction: -1 | 1) {
    const distance = railRef.current?.clientWidth ?? 420;
    railRef.current?.scrollBy({ left: direction * distance, behavior: "smooth" });
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[276px] min-w-[340px] flex-1 border border-tertiary bg-surface animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between gap-4 border border-error/40 bg-surface px-4 py-4">
        <p className="text-[14px] text-error">Couldn&apos;t read the registry for this network. Check your RPC connection.</p>
        <button className="underline underline-offset-4 text-[13px]" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (!pairs || pairs.length === 0) {
    return (
      <div className="border border-tertiary bg-surface p-6 text-center">
        <p className="text-[15px]">No pairs found on the registry yet.</p>
        <p className="mt-1 text-[13px] text-tertiary">
          Add a dev pair in <code>lib/pairs.local.json</code> to test against a custom wrapper.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={railRef}
        className="flex snap-x gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {pairs.map((pair) => (
          <div key={`${pair.chainId}-${pair.tokenAddress}`} className="min-w-[320px] snap-start sm:min-w-[360px] xl:flex-[0_0_360px]">
            <PairCard
              pair={pair}
              onEditImportedPair={onEditImportedPair}
              onRemoveImportedPair={onRemoveImportedPair}
            />
          </div>
        ))}
      </div>
      <div className="absolute right-0 top-1/2 hidden translate-x-[calc(100%+8px)] -translate-y-1/2 flex-col border border-tertiary bg-surface md:flex">
        <button
          aria-label="Previous pairs"
          className="grid h-10 w-10 place-items-center border-b border-tertiary font-mono text-[22px] text-fg hover:bg-neutral"
          onClick={() => scrollRail(-1)}
        >
          ‹
        </button>
        <button
          aria-label="Next pairs"
          className="grid h-10 w-10 place-items-center font-mono text-[22px] text-fg hover:bg-neutral"
          onClick={() => scrollRail(1)}
        >
          ›
        </button>
      </div>
    </div>
  );
}
