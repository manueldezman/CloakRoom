"use client";

import { ZamaSDK } from "@zama-fhe/sdk";
import { createConfig } from "@zama-fhe/sdk/viem";
import { mainnet as mainnetFhe, sepolia as sepoliaFhe, type FheChain } from "@zama-fhe/sdk/chains";
import { web } from "@zama-fhe/sdk/web";
import type { PublicClient, WalletClient } from "viem";
import { getExplorerTxUrl, getSupportedChainId, type SupportedChainId } from "./chains";
import { erc20ReadAbi } from "./abis";

const FHE_CHAINS: Record<SupportedChainId, FheChain> = {
  [mainnetFhe.id]: mainnetFhe,
  [sepoliaFhe.id]: sepoliaFhe,
};

export function getZamaSDK(
  chainId: SupportedChainId,
  walletClient: WalletClient,
  publicClient: PublicClient
): ZamaSDK {
  const fheChain = FHE_CHAINS[chainId];
  const relayerUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/relayer/${chainId}`
      : `/api/relayer/${chainId}`;

  const chain = { ...fheChain, relayerUrl } as const satisfies FheChain;

  return new ZamaSDK(
    createConfig({
      chains: [chain],
      publicClient,
      walletClient,
      relayers: { [chain.id]: web() },
    })
  );
}

export function resetZamaSDK() {
  return;
}

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
      /returned no data|0x\)|interface|not.*7984|invalid contract|address is not a contract|confidentialBalanceOf|HTTP error! status: 404/i.test(
        message
      )
    ) {
      return { status: "not-erc7984" };
    }
    if (/HTTP error! status: 500/i.test(message)) {
      return {
        status: "unknown-error",
        message:
          "This token rejected the confidential balance read on the active network. Double-check that you pasted an ERC-7984 contract address.",
      };
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
  publicClient: PublicClient,
  tokenAddress: `0x${string}`
): Promise<TokenDisplayMetadata> {
  const [name, symbol] = await Promise.allSettled([
    publicClient.readContract({ address: tokenAddress, abi: erc20ReadAbi, functionName: "name" }),
    publicClient.readContract({ address: tokenAddress, abi: erc20ReadAbi, functionName: "symbol" }),
  ]);

  return {
    name: name.status === "fulfilled" ? name.value : null,
    symbol: symbol.status === "fulfilled" ? symbol.value : null,
  };
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

export function currentExplorerUrl(chainId: SupportedChainId, txHash: string) {
  return getExplorerTxUrl(getSupportedChainId(chainId), txHash);
}
