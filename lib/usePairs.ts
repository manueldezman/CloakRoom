"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAllPairs } from "./registry";

export function usePairs() {
  return useQuery({
    queryKey: ["wrapper-pairs"],
    queryFn: fetchAllPairs,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
