import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { DefaultRegistryAddresses } from "@zama-fhe/sdk";

export const SEPOLIA_CHAIN_ID = sepolia.id; // 11155111

export const SEPOLIA_RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org";

// The SDK itself ships the official registry address per chain — no more
// manual doc-hunting required. NEXT_PUBLIC_REGISTRY_ADDRESS in .env.local is
// now only a manual OVERRIDE (e.g. to point at a self-deployed registry for
// local testing), not a requirement.
export const REGISTRY_ADDRESS = (process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ??
  DefaultRegistryAddresses[SEPOLIA_CHAIN_ID] ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

// A plain read-only client, reused across the app for registry/metadata reads.
// This never touches the Zama SDK/relayer — registry data isn't encrypted,
// so there's no reason to route it through the confidential-compute path.
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(SEPOLIA_RPC_URL),
});
