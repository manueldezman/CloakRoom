"use client";

import { ZamaSDK, DefaultRegistryAddresses } from "@zama-fhe/sdk";
import { createConfig } from "@zama-fhe/sdk/viem";
import { sepolia as sepoliaFhe, type FheChain } from "@zama-fhe/sdk/chains";
import { web } from "@zama-fhe/sdk/web";
import type { PublicClient, WalletClient } from "viem";
import { SEPOLIA_CHAIN_ID } from "./chains";

// Rewritten against the ACTUAL installed package's type definitions
// (node_modules/@zama-fhe/sdk/dist/esm/index.d.ts), not docs — this SDK's
// docs changed shape multiple times during this project, so treat only the
// installed types as ground truth. Root-level imports are used throughout
// since createConfig, ZamaSDK, and DefaultRegistryAddresses are all exported
// directly from "@zama-fhe/sdk" per its real export list.

let sdkSingleton: ZamaSDK | null = null;

export function getZamaSDK(walletClient: WalletClient, publicClient: PublicClient): ZamaSDK {
  if (sdkSingleton) return sdkSingleton;

  const relayerUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/relayer/${SEPOLIA_CHAIN_ID}`
      : `/api/relayer/${SEPOLIA_CHAIN_ID}`;

  const mySepolia = { ...sepoliaFhe, relayerUrl } as const satisfies FheChain;

  const config = createConfig({
    chains: [mySepolia],
    publicClient,
    walletClient,
    relayers: { [mySepolia.id]: web() },
  });

  sdkSingleton = new ZamaSDK(config);
  return sdkSingleton;
}

export function resetZamaSDK() {
  sdkSingleton = null;
}

/** The official registry address, shipped BY the SDK — no manual lookup needed. */
export const OFFICIAL_REGISTRY_ADDRESS = DefaultRegistryAddresses[SEPOLIA_CHAIN_ID] as
  | `0x${string}`
  | undefined;

export type DecryptResult =
  | { status: "ok"; value: bigint }
  | { status: "denied" }
  | { status: "no-acl-grant" }
  | { status: "not-erc7984" }
  | { status: "unknown-error"; message: string };

export type TokenDisplayMetadata = {
  name?: string | null;
  symbol?: string | null;
};

/**
 * Decrypts the connected wallet's balance on ANY ERC-7984 address.
 * Uses `createToken` (the generic Token class) deliberately — NOT
 * `createWrappedToken` — because an arbitrary pasted address is not
 * necessarily a wrapper contract; it's just some ERC-7984 token.
 */
export async function decryptBalance(
  sdk: ZamaSDK,
  tokenAddress: `0x${string}`,
  account: `0x${string}`
): Promise<DecryptResult> {
  try {
    const token = sdk.createToken(tokenAddress);
    const value = await token.balanceOf(account);
    return { status: "ok", value };
  } catch (err: any) {
    const message: string = err?.message ?? String(err);
    if (/denied|rejected/i.test(message)) return { status: "denied" };
    if (/acl|not authorized|no permission/i.test(message)) return { status: "no-acl-grant" };
    if (
      /returned no data|0x\)|interface|not.*7984|invalid contract|address is not a contract/i.test(
        message
      )
    ) {
      return { status: "not-erc7984" };
    }
    if (/confidentialBalanceOf.*revert|confidentialBalanceOf.*reverted/i.test(message)) {
      return {
        status: "unknown-error",
        message:
          "This contract rejected confidential balance reads for your wallet. Make sure you pasted the correct confidential token address on Sepolia.",
      };
    }
    return { status: "unknown-error", message };
  }
}

export async function getTokenDisplayMetadata(
  sdk: ZamaSDK,
  tokenAddress: `0x${string}`
): Promise<TokenDisplayMetadata> {
  try {
    const token = sdk.createToken(tokenAddress);
    const [name, symbol] = await Promise.allSettled([token.name(), token.symbol()]);

    return {
      name: name.status === "fulfilled" ? name.value : null,
      symbol: symbol.status === "fulfilled" ? symbol.value : null,
    };
  } catch {
    return {};
  }
}

export type WrapResult = { status: "ok"; txHash: `0x${string}` } | { status: "error"; message: string };

/**
 * Wrap: ERC-20 -> ERC-7984. Deliberately uses `createWrappedToken` (the
 * WrappedToken class) since this operates on a registry wrapper contract
 * specifically, not a generic ERC-7984 token.
 */
export async function wrapToken(
  sdk: ZamaSDK,
  confidentialTokenAddress: `0x${string}`,
  amount: bigint
): Promise<WrapResult> {
  try {
    const wrappedToken = sdk.createWrappedToken(confidentialTokenAddress);
    const tx = await wrappedToken.shield(amount);
    return { status: "ok", txHash: tx.txHash as `0x${string}` };
  } catch (err: any) {
    return { status: "error", message: err?.message ?? String(err) };
  }
}

/**
 * Unwrap: ERC-7984 -> ERC-20.
 * Confirmed from the installed types: unshield() fully orchestrates the
 * two-step flow (submit unwrap → wait for receipt → parse event →
 * finalizeUnwrap) before resolving. So unlike my earlier assumption, "done"
 * here does mean the underlying ERC-20 has actually landed — no separate
 * pending/reload-persistent state is needed for the common case. The one
 * remaining edge case: if the browser closes mid-flow, `resumeUnshield(txHash)`
 * exists specifically to recover from that — worth wiring up as a later
 * improvement, not required for a first working version.
 */
export async function unwrapToken(
  sdk: ZamaSDK,
  confidentialTokenAddress: `0x${string}`,
  amount: bigint
): Promise<WrapResult> {
  try {
    const wrappedToken = sdk.createWrappedToken(confidentialTokenAddress);
    const tx = await wrappedToken.unshield(amount);
    return { status: "ok", txHash: tx.txHash as `0x${string}` };
  } catch (err: any) {
    return { status: "error", message: err?.message ?? String(err) };
  }
}
