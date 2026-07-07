/**
 * Run in CI on every PR that touches lib/pairs.local.json.
 * For each declared custom pair, verifies on the matching supported chain that:
 *   1. The confidential token address actually implements ERC-7984.
 *   2. The underlying ERC-20 address isn't already an official registry pair.
 */
import { DefaultRegistryAddresses, ERC7984_WRAPPER_INTERFACE_ID } from "@zama-fhe/sdk";
import { createPublicClient, http } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { registryAbi, erc165Abi } from "../lib/abis";
import pairs from "../lib/pairs.local.json";

type Pair = {
  tokenAddress: `0x${string}`;
  confidentialTokenAddress: `0x${string}`;
  label?: string;
  network: "mainnet" | "sepolia";
};

const CHAIN_CONFIG = {
  mainnet: {
    chain: mainnet,
    rpc: process.env.NEXT_PUBLIC_MAINNET_RPC_URL ?? "https://ethereum-rpc.publicnode.com",
    registry: DefaultRegistryAddresses[mainnet.id] as `0x${string}`,
  },
  sepolia: {
    chain: sepolia,
    rpc: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org",
    registry: DefaultRegistryAddresses[sepolia.id] as `0x${string}`,
  },
} as const;

async function main() {
  let failed = false;
  const declaredPairs = pairs as readonly Pair[];

  for (const network of ["mainnet", "sepolia"] as const) {
    const config = CHAIN_CONFIG[network];
    const localPairs = declaredPairs.filter((pair) => pair.network === network);
    if (localPairs.length === 0) continue;

    const client = createPublicClient({ chain: config.chain, transport: http(config.rpc) });
    const officialLength = await client.readContract({
      address: config.registry,
      abi: registryAbi,
      functionName: "getTokenConfidentialTokenPairsLength",
    });
    const official = await client.readContract({
      address: config.registry,
      abi: registryAbi,
      functionName: "getTokenConfidentialTokenPairsSlice",
      args: [0n, officialLength],
    });
    const officialAddrs = new Set(official.map((p) => p.tokenAddress.toLowerCase()));

    for (const pair of localPairs) {
      console.log(`\nChecking pair: ${pair.label ?? pair.tokenAddress} (${network})`);

      if (officialAddrs.has(pair.tokenAddress.toLowerCase())) {
        console.error(`  ✗ ${pair.tokenAddress} is already an official registry pair — remove this custom entry.`);
        failed = true;
        continue;
      }

      try {
        const supports = await client.readContract({
          address: pair.confidentialTokenAddress,
          abi: erc165Abi,
          functionName: "supportsInterface",
          args: [ERC7984_WRAPPER_INTERFACE_ID],
        });
        if (!supports) {
          console.error(`  ✗ ${pair.confidentialTokenAddress} does not report ERC-7984 support.`);
          failed = true;
          continue;
        }
        console.log(`  ✓ ${pair.confidentialTokenAddress} implements ERC-7984.`);
      } catch (err) {
        console.error(`  ✗ Couldn't call supportsInterface on ${pair.confidentialTokenAddress}: ${err}`);
        failed = true;
      }
    }
  }

  if (failed) {
    console.error("\nOne or more pairs failed validation.");
    process.exit(1);
  }
  console.log("\nAll custom pairs validated successfully.");
}

main();
