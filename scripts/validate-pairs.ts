/**
 * Run in CI on every PR that touches lib/pairs.local.json.
 * For each declared custom pair, verifies on live Sepolia that:
 *   1. The confidential token address actually implements ERC-7984
 *      (via ERC-165 supportsInterface(0x4958f2a4)).
 *   2. The underlying ERC-20 address isn't already an OFFICIAL registry pair
 *      (custom entries should never shadow an official one).
 *
 * Usage: npm run validate-pairs
 * Exits non-zero (failing the PR check) if any entry is invalid.
 */
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { ERC7984_WRAPPER_INTERFACE_ID } from "@zama-fhe/sdk";
import { registryAbi, erc165Abi } from "../lib/abis";
import pairs from "../lib/pairs.local.json";

const RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? process.env.SEPOLIA_RPC_URL;
const REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}` | undefined;

async function main() {
  if (!RPC_URL || !REGISTRY_ADDRESS) {
    console.error("Missing NEXT_PUBLIC_SEPOLIA_RPC_URL or NEXT_PUBLIC_REGISTRY_ADDRESS env vars.");
    process.exit(1);
  }

  const client = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
  let failed = false;

  const officialLength = await client.readContract({
    address: REGISTRY_ADDRESS as `0x${string}`,
    abi: registryAbi,
    functionName: "getTokenConfidentialTokenPairsLength",
  });
  const official = await client.readContract({
    address: REGISTRY_ADDRESS as `0x${string}`,
    abi: registryAbi,
    functionName: "getTokenConfidentialTokenPairsSlice",
    args: [0n, officialLength],
  });
  const officialAddrs = new Set(
    (official as { tokenAddress: string }[]).map((p) => p.tokenAddress.toLowerCase())
  );

  for (const pair of pairs as { tokenAddress: string; confidentialTokenAddress: string; label?: string }[]) {
    console.log(`\nChecking pair: ${pair.label ?? pair.tokenAddress}`);

    if (officialAddrs.has(pair.tokenAddress.toLowerCase())) {
      console.error(`  ✗ ${pair.tokenAddress} is already an OFFICIAL registry pair — remove this custom entry.`);
      failed = true;
      continue;
    }

    try {
      const supports = await client.readContract({
        address: pair.confidentialTokenAddress as `0x${string}`,
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

  if (failed) {
    console.error("\nOne or more pairs failed validation.");
    process.exit(1);
  }
  console.log("\nAll custom pairs validated successfully.");
}

main();
