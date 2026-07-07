"use client";

import { usePairs } from "@/lib/usePairs";
import { PairCard } from "./PairCard";

export function PairList() {
  const { data: pairs, isLoading, isError, refetch } = usePairs();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-sm">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[132px] rounded-md bg-surface animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border border-error p-md flex items-center justify-between">
        <p className="text-body-md text-error">Couldn't read the registry. Check your RPC connection.</p>
        <button className="underline text-body-sm" onClick={() => refetch()}>
          Retry
        </button>
      </div>
    );
  }

  if (!pairs || pairs.length === 0) {
    return (
      <div className="rounded-md border border-tertiary p-lg text-center">
        <p className="text-body-md">No pairs found on the registry yet.</p>
        <p className="text-body-sm text-tertiary mt-1">
          Add a dev pair in <code>lib/pairs.local.json</code> to test against a custom wrapper.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-sm">
      {pairs.map((pair) => (
        <PairCard key={pair.tokenAddress} pair={pair} />
      ))}
    </div>
  );
}
