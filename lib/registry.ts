import { WrappersRegistry, type TokenWrapperPairWithMetadata } from "@zama-fhe/sdk";
import { publicClient, REGISTRY_ADDRESS, SEPOLIA_CHAIN_ID } from "./chains";
import { erc165Abi, erc20ReadAbi, erc7984ReadAbi } from "./abis";
import { ERC7984_WRAPPER_INTERFACE_ID } from "@zama-fhe/sdk";
import localPairsRaw from "./pairs.local.json";

export type PairSource = "official" | "custom";

export type WrapperPair = {
  tokenAddress: `0x${string}`;
  confidentialTokenAddress: `0x${string}`;
  source: PairSource;
  label?: string;
  // Enriched metadata — undefined until resolved, null if a read failed.
  tokenSymbol?: string | null;
  tokenName?: string | null;
  tokenDecimals?: number | null;
  confidentialSymbol?: string | null;
  confidentialName?: string | null;
  confidentialDecimals?: number | null;
  // Official pairs come from the SDK-backed registry path. Custom pairs are
  // still live-validated manually before the UI enables wrap/unwrap.
  supportsErc7984: boolean;
  flagged: boolean;
};

type LocalPair = {
  tokenAddress: `0x${string}`;
  confidentialTokenAddress: `0x${string}`;
  label?: string;
  network: string;
};

const wrappersRegistry = new WrappersRegistry({
  provider: publicClient,
  registryAddresses: { [SEPOLIA_CHAIN_ID]: REGISTRY_ADDRESS },
});

/**
 * Reads every official pair through the SDK's built-in registry wrapper.
 * The SDK still returns `isValid` on each entry, so we keep the explicit
 * filter to avoid surfacing revoked pairs.
 */
async function fetchValidOfficialPairs(): Promise<TokenWrapperPairWithMetadata[]> {
  const length = await wrappersRegistry.getTokenPairsLength();

  if (length === 0n) return [];

  const page = await wrappersRegistry.listPairs({
    page: 1,
    pageSize: Number(length),
    metadata: true,
  });

  return page.items.filter((pair) => pair.isValid);
}

function mapOfficialPairs(pairs: TokenWrapperPairWithMetadata[]): WrapperPair[] {
  return pairs.map((pair) => ({
    tokenAddress: pair.tokenAddress,
    confidentialTokenAddress: pair.confidentialTokenAddress,
    source: "official",
    tokenSymbol: pair.underlying.symbol,
    tokenName: pair.underlying.name,
    tokenDecimals: pair.underlying.decimals,
    confidentialSymbol: pair.confidential.symbol,
    confidentialName: pair.confidential.name,
    confidentialDecimals: pair.confidential.decimals,
    supportsErc7984: true,
    flagged: false,
  }));
}

/**
 * For each candidate pair, re-verify ERC-165/ERC-7984 support and pull
 * display metadata in one batched multicall. A single malformed pair must
 * never crash the whole list — allowFailure keeps failures scoped per-call.
 */
async function enrichCustomPairs(
  pairs: { tokenAddress: `0x${string}`; confidentialTokenAddress: `0x${string}` }[],
  source: PairSource,
  labels?: Map<string, string>
): Promise<WrapperPair[]> {
  if (pairs.length === 0) return [];

  const contracts = pairs.flatMap((p) => [
    {
      address: p.confidentialTokenAddress,
      abi: erc165Abi,
      functionName: "supportsInterface",
      args: [ERC7984_WRAPPER_INTERFACE_ID],
    } as const,
    { address: p.tokenAddress, abi: erc20ReadAbi, functionName: "symbol" } as const,
    { address: p.tokenAddress, abi: erc20ReadAbi, functionName: "name" } as const,
    { address: p.tokenAddress, abi: erc20ReadAbi, functionName: "decimals" } as const,
    { address: p.confidentialTokenAddress, abi: erc7984ReadAbi, functionName: "symbol" } as const,
    { address: p.confidentialTokenAddress, abi: erc7984ReadAbi, functionName: "name" } as const,
    { address: p.confidentialTokenAddress, abi: erc7984ReadAbi, functionName: "decimals" } as const,
  ]);

  const results = await publicClient.multicall({ contracts, allowFailure: true });

  return pairs.map((p, i) => {
    const [supports, tSymbol, tName, tDecimals, cSymbol, cName, cDecimals] = results.slice(i * 7, i * 7 + 7);

    const supportsErc7984 = supports.status === "success" ? Boolean(supports.result) : false;

    return {
      tokenAddress: p.tokenAddress,
      confidentialTokenAddress: p.confidentialTokenAddress,
      source,
      label: labels?.get(p.tokenAddress.toLowerCase()),
      tokenSymbol: tSymbol.status === "success" ? (tSymbol.result as string) : null,
      tokenName: tName.status === "success" ? (tName.result as string) : null,
      tokenDecimals: tDecimals.status === "success" ? (tDecimals.result as number) : null,
      confidentialSymbol: cSymbol.status === "success" ? (cSymbol.result as string) : null,
      confidentialName: cName.status === "success" ? (cName.result as string) : null,
      confidentialDecimals: cDecimals.status === "success" ? (cDecimals.result as number) : null,
      supportsErc7984,
      // Custom entries stay on the manual validation path so a bad local pair
      // never silently looks like a safe official registry entry.
      flagged: !supportsErc7984 || (tSymbol.status !== "success" && cSymbol.status !== "success"),
    };
  });
}

function loadLocalPairs(): LocalPair[] {
  return (localPairsRaw as LocalPair[]).filter(
    (p) => p.network === "sepolia" && p.tokenAddress !== "0x0000000000000000000000000000000000dEaD"
  );
}

/**
 * The single entry point the UI calls. Onchain (official) pairs always win
 * over a local pair declared for the same underlying ERC-20 — the registry
 * is the source of truth, local config only fills gaps.
 */
export async function fetchAllPairs(): Promise<WrapperPair[]> {
  const [officialRaw, local] = await Promise.all([
    fetchValidOfficialPairs(),
    Promise.resolve(loadLocalPairs()),
  ]);

  const officialAddresses = new Set(officialRaw.map((p) => p.tokenAddress.toLowerCase()));
  const customOnly = local.filter((p) => !officialAddresses.has(p.tokenAddress.toLowerCase()));
  const labels = new Map(local.map((p) => [p.tokenAddress.toLowerCase(), p.label ?? ""]));

  const [official, custom] = await Promise.all([
    Promise.resolve(mapOfficialPairs(officialRaw)),
    enrichCustomPairs(customOnly, "custom", labels),
  ]);

  return [...official, ...custom];
}
