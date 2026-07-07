import {
  ERC7984_WRAPPER_INTERFACE_ID,
  WrappersRegistry,
  type TokenWrapperPairWithMetadata,
} from "@zama-fhe/sdk";
import { ViemProvider } from "@zama-fhe/sdk/viem";
import { erc165Abi, erc20ReadAbi, erc7984ReadAbi } from "./abis";
import { getChainKey, getPublicClientForChain, getRegistryAddress, type SupportedChainId } from "./chains";
import localPairsRaw from "./pairs.local.json";

export type PairSource = "official" | "custom-config" | "imported-local";

export type WrapperPair = {
  chainId: SupportedChainId;
  tokenAddress: `0x${string}`;
  confidentialTokenAddress: `0x${string}`;
  source: PairSource;
  label?: string;
  tokenSymbol?: string | null;
  tokenName?: string | null;
  tokenDecimals?: number | null;
  confidentialSymbol?: string | null;
  confidentialName?: string | null;
  confidentialDecimals?: number | null;
  supportsErc7984: boolean;
  flagged: boolean;
};

type LocalPair = {
  tokenAddress: `0x${string}`;
  confidentialTokenAddress: `0x${string}`;
  label?: string;
  network: string;
};

export type ImportedPair = {
  chainId: SupportedChainId;
  tokenAddress: `0x${string}`;
  confidentialTokenAddress: `0x${string}`;
  label?: string;
};

async function fetchValidOfficialPairs(chainId: SupportedChainId): Promise<TokenWrapperPairWithMetadata[]> {
  const publicClient = getPublicClientForChain(chainId);
  const wrappersRegistry = new WrappersRegistry({
    provider: new ViemProvider({ publicClient }),
    registryAddresses: { [chainId]: getRegistryAddress(chainId) },
  });

  const length = await wrappersRegistry.getTokenPairsLength();
  if (length === 0n) return [];

  const page = await wrappersRegistry.listPairs({
    page: 1,
    pageSize: Number(length),
    metadata: true,
  });

  return page.items.filter((pair) => pair.isValid && !isExcludedOfficialPair(pair));
}

function mapOfficialPairs(chainId: SupportedChainId, pairs: TokenWrapperPairWithMetadata[]): WrapperPair[] {
  return pairs.map((pair) => ({
    chainId,
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

async function enrichCustomPairs(
  chainId: SupportedChainId,
  source: Exclude<PairSource, "official">,
  pairs: { tokenAddress: `0x${string}`; confidentialTokenAddress: `0x${string}` }[],
  labels?: Map<string, string>
): Promise<WrapperPair[]> {
  if (pairs.length === 0) return [];

  const publicClient = getPublicClientForChain(chainId);
  const contracts = pairs.flatMap((pair) => [
    {
      address: pair.confidentialTokenAddress,
      abi: erc165Abi,
      functionName: "supportsInterface",
      args: [ERC7984_WRAPPER_INTERFACE_ID],
    } as const,
    { address: pair.tokenAddress, abi: erc20ReadAbi, functionName: "symbol" } as const,
    { address: pair.tokenAddress, abi: erc20ReadAbi, functionName: "name" } as const,
    { address: pair.tokenAddress, abi: erc20ReadAbi, functionName: "decimals" } as const,
    { address: pair.confidentialTokenAddress, abi: erc7984ReadAbi, functionName: "symbol" } as const,
    { address: pair.confidentialTokenAddress, abi: erc7984ReadAbi, functionName: "name" } as const,
    { address: pair.confidentialTokenAddress, abi: erc7984ReadAbi, functionName: "decimals" } as const,
  ]);

  const results = await publicClient.multicall({ contracts, allowFailure: true });

  return pairs.map((pair, index) => {
    const [supports, tSymbol, tName, tDecimals, cSymbol, cName, cDecimals] = results.slice(
      index * 7,
      index * 7 + 7
    );

    const supportsErc7984 = supports.status === "success" ? Boolean(supports.result) : false;

    return {
      chainId,
      tokenAddress: pair.tokenAddress,
      confidentialTokenAddress: pair.confidentialTokenAddress,
      source,
      label: labels?.get(pair.tokenAddress.toLowerCase()) || undefined,
      tokenSymbol: tSymbol.status === "success" ? (tSymbol.result as string) : null,
      tokenName: tName.status === "success" ? (tName.result as string) : null,
      tokenDecimals: tDecimals.status === "success" ? (tDecimals.result as number) : null,
      confidentialSymbol: cSymbol.status === "success" ? (cSymbol.result as string) : null,
      confidentialName: cName.status === "success" ? (cName.result as string) : null,
      confidentialDecimals: cDecimals.status === "success" ? (cDecimals.result as number) : null,
      supportsErc7984,
      flagged: !supportsErc7984 || (tSymbol.status !== "success" && cSymbol.status !== "success"),
    };
  });
}

function loadLocalPairs(chainId: SupportedChainId): LocalPair[] {
  const expectedNetwork = getChainKey(chainId);
  return (localPairsRaw as LocalPair[]).filter(
    (pair) =>
      pair.network === expectedNetwork &&
      pair.tokenAddress !== "0x0000000000000000000000000000000000dEaD"
  );
}

function isExcludedOfficialPair(pair: TokenWrapperPairWithMetadata) {
  const haystack = [
    pair.underlying.name,
    pair.underlying.symbol,
    pair.confidential.name,
    pair.confidential.symbol,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes("steak");
}

export async function fetchAllPairs(
  chainId: SupportedChainId,
  importedPairs: ImportedPair[] = []
): Promise<WrapperPair[]> {
  const [officialRaw, local] = await Promise.all([
    fetchValidOfficialPairs(chainId),
    Promise.resolve(loadLocalPairs(chainId)),
  ]);

  const officialTokenAddresses = new Set(officialRaw.map((pair) => pair.tokenAddress.toLowerCase()));
  const localOnly = local.filter((pair) => !officialTokenAddresses.has(pair.tokenAddress.toLowerCase()));
  const mergedTokenAddresses = new Set([
    ...officialTokenAddresses,
    ...localOnly.map((pair) => pair.tokenAddress.toLowerCase()),
  ]);
  const importedOnly = importedPairs.filter(
    (pair) => pair.chainId === chainId && !mergedTokenAddresses.has(pair.tokenAddress.toLowerCase())
  );

  const localLabels = new Map(localOnly.map((pair) => [pair.tokenAddress.toLowerCase(), pair.label ?? ""]));
  const importedLabels = new Map(
    importedOnly.map((pair) => [pair.tokenAddress.toLowerCase(), pair.label ?? ""])
  );

  const localAddressSet = new Set(localOnly.map((pair) => pair.tokenAddress.toLowerCase()));
  const uniqueImportedOnly = importedOnly.filter((pair) => !localAddressSet.has(pair.tokenAddress.toLowerCase()));

  const [official, customConfig, importedLocal] = await Promise.all([
    Promise.resolve(mapOfficialPairs(chainId, officialRaw)),
    enrichCustomPairs(chainId, "custom-config", localOnly, localLabels),
    enrichCustomPairs(chainId, "imported-local", uniqueImportedOnly, importedLabels),
  ]);

  return [...official, ...customConfig, ...importedLocal];
}
