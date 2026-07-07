import { DefaultRegistryAddresses } from "@zama-fhe/sdk";
import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet, sepolia, type Chain } from "viem/chains";

export const DEFAULT_CHAIN_ID = sepolia.id;
export const SUPPORTED_CHAINS = [mainnet, sepolia] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number]["id"];

type SupportedChainConfig = {
  id: SupportedChainId;
  key: "mainnet" | "sepolia";
  label: string;
  shortLabel: string;
  chain: Chain;
  faucetEnabled: boolean;
  gasWarning:
    | null
    | string;
  explorerBaseUrl: string;
};

const CHAIN_CONFIGS: Record<SupportedChainId, SupportedChainConfig> = {
  [mainnet.id]: {
    id: mainnet.id,
    key: "mainnet",
    label: "Ethereum Mainnet",
    shortLabel: "Mainnet",
    chain: mainnet,
    faucetEnabled: false,
    gasWarning:
      "Mainnet transactions use real ETH for gas and include confidential relayer work. Review gas before approving or wrapping.",
    explorerBaseUrl: "https://etherscan.io",
  },
  [sepolia.id]: {
    id: sepolia.id,
    key: "sepolia",
    label: "Sepolia",
    shortLabel: "Sepolia",
    chain: sepolia,
    faucetEnabled: true,
    gasWarning: null,
    explorerBaseUrl: "https://sepolia.etherscan.io",
  },
};

const RPC_URLS: Record<SupportedChainId, string> = {
  [mainnet.id]: process.env.NEXT_PUBLIC_MAINNET_RPC_URL ?? "https://ethereum-rpc.publicnode.com",
  [sepolia.id]: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org",
};

const publicClients = new Map<SupportedChainId, PublicClient>();

export function isSupportedChainId(chainId: number | undefined | null): chainId is SupportedChainId {
  return chainId === mainnet.id || chainId === sepolia.id;
}

export function getSupportedChainId(chainId: number | undefined | null): SupportedChainId {
  return isSupportedChainId(chainId) ? chainId : DEFAULT_CHAIN_ID;
}

export function getChainConfig(chainId: SupportedChainId): SupportedChainConfig {
  return CHAIN_CONFIGS[chainId];
}

export function getChainKey(chainId: SupportedChainId) {
  return CHAIN_CONFIGS[chainId].key;
}

export function getRegistryAddress(chainId: SupportedChainId): `0x${string}` {
  return (DefaultRegistryAddresses[chainId] ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
}

export function getExplorerTxUrl(chainId: SupportedChainId, txHash: string) {
  return `${CHAIN_CONFIGS[chainId].explorerBaseUrl}/tx/${txHash}`;
}

export function getExplorerAddressUrl(chainId: SupportedChainId, address: string) {
  return `${CHAIN_CONFIGS[chainId].explorerBaseUrl}/address/${address}`;
}

export function getPublicClientForChain(chainId: SupportedChainId) {
  const cached = publicClients.get(chainId);
  if (cached) return cached;

  const client = createPublicClient({
    chain: CHAIN_CONFIGS[chainId].chain,
    transport: http(RPC_URLS[chainId]),
  });

  publicClients.set(chainId, client);
  return client;
}
