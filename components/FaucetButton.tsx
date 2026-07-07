"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { faucetAbi } from "@/lib/abis";
import { Button } from "./Button";

type FaucetPolicy =
  | { enabled: true; amount: bigint }
  | { enabled: false; reason: string };

const FAUCET_POLICIES: Record<`0x${string}`, FaucetPolicy> = {
  "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF": { enabled: true, amount: 1000n * 10n ** 6n },
  "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0": { enabled: true, amount: 1000n * 10n ** 6n },
  "0x24377AE4AA0C45ecEe71225007f17c5D423dd940": { enabled: true, amount: 1000n * 10n ** 6n },
  "0xff54739b16576FA5402F211D0b938469Ab9A5f3F": { enabled: true, amount: 1000n * 10n ** 18n },
  "0xFf021fB13cA64e5354c62c954b949a88cfDEb25E": { enabled: true, amount: 1000n * 10n ** 18n },
  "0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57": { enabled: true, amount: 1000n * 10n ** 18n },
  "0x93c931278A2aad1916783F952f94276eA5111442": { enabled: true, amount: 1000n * 10n ** 18n },
  "0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3": {
    enabled: false,
    reason: "Mint is restricted for this token pair.",
  },
};

export function FaucetButton({
  tokenAddress,
  tokenSymbol,
  tokenDecimals,
  buttonLabel = "Faucet",
}: {
  tokenAddress: `0x${string}`;
  tokenSymbol?: string | null;
  tokenDecimals?: number | null;
  buttonLabel?: string;
}) {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const policy = FAUCET_POLICIES[tokenAddress] ?? {
    enabled: false,
    reason: "No public faucet for this token",
  };

  async function claim() {
    if (!address || !policy.enabled) return;
    setStatus("idle");
    try {
      await writeContractAsync({
        address: tokenAddress,
        abi: faucetAbi,
        functionName: "mint",
        args: [address, policy.amount],
      });
      setStatus("ok");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(readableFaucetError(err?.shortMessage ?? err?.message ?? String(err), tokenSymbol, tokenDecimals));
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" onClick={claim} disabled={!address || isPending || !policy.enabled}>
        {isPending ? "Claiming..." : buttonLabel}
      </Button>
      {!policy.enabled && <p className="text-body-sm text-tertiary">{policy.reason}</p>}
      {status === "ok" && <p className="text-body-sm text-secondary">Claimed. Check your wallet.</p>}
      {status === "error" && <p className="text-body-sm text-error">{errorMsg}</p>}
    </div>
  );
}

function readableFaucetError(message: string, tokenSymbol?: string | null, tokenDecimals?: number | null): string {
  if (/user rejected/i.test(message)) return "You cancelled the request.";
  if (/MintAmountExceedsMax/i.test(message)) {
    const symbol = tokenSymbol ?? "this token";
    const decimals = tokenDecimals ?? 18;
    const units = formatUnits(extractMaxAmount(message) ?? 0n, decimals);
    return `Faucet limit reached for ${symbol} - max claim is ${units} ${symbol}.`;
  }
  if (/exceed|limit|cooldown/i.test(message)) return "Faucet limit reached - try again later.";
  return "Couldn't claim from the faucet right now.";
}

function extractMaxAmount(message: string): bigint | null {
  const match = message.match(/maxAmount=(\d+)/i);
  return match ? BigInt(match[1]) : null;
}

function formatUnits(value: bigint, decimals: number): string {
  const s = value.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals) || "0";
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}
