"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { erc20ReadAbi } from "@/lib/abis";
import { useZamaSDK } from "@/lib/useZamaSDK";
import { decryptBalance, wrapToken, unwrapToken } from "@/lib/zama";
import { Button } from "./Button";
import type { WrapperPair } from "@/lib/registry";

type Mode = "wrap" | "unwrap";
type Step = "idle" | "checking" | "submitting" | "done" | "error";

export function WrapUnwrapDialog({ pair, onClose }: { pair: WrapperPair; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("wrap");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [availableBalance, setAvailableBalance] = useState<bigint | null>(null);
  const [balanceState, setBalanceState] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const { address } = useAccount();
  const publicClient = usePublicClient();
  const sdk = useZamaSDK();
  const decimals = mode === "wrap" ? pair.tokenDecimals ?? 18 : pair.confidentialDecimals ?? pair.tokenDecimals ?? 18;

  useEffect(() => {
    let cancelled = false;

    async function loadBalance() {
      if (!address || !publicClient || !sdk) {
        if (!cancelled) {
          setAvailableBalance(null);
          setBalanceState("idle");
        }
        return;
      }

      setBalanceState("loading");

      try {
        if (mode === "wrap") {
          const balance = await publicClient.readContract({
            address: pair.tokenAddress,
            abi: erc20ReadAbi,
            functionName: "balanceOf",
            args: [address],
          });
          if (!cancelled) {
            setAvailableBalance(balance);
            setBalanceState("ready");
          }
          return;
        }

        const result = await decryptBalance(sdk, pair.confidentialTokenAddress, address);
        if (cancelled) return;

        if (result.status === "ok") {
          setAvailableBalance(result.value);
          setBalanceState("ready");
        } else {
          setAvailableBalance(null);
          setBalanceState("error");
        }
      } catch {
        if (!cancelled) {
          setAvailableBalance(null);
          setBalanceState("error");
        }
      }
    }

    loadBalance();

    return () => {
      cancelled = true;
    };
  }, [address, mode, pair.confidentialTokenAddress, pair.tokenAddress, publicClient, sdk]);

  async function submit() {
    if (!sdk || !address || !publicClient) return;
    let parsed: bigint;
    try {
      parsed = parseUnits(amount, decimals);
    } catch {
      setStep("error");
      setMessage("Enter a valid amount.");
      return;
    }
    if (parsed <= 0n) {
      setStep("error");
      setMessage("Amount must be greater than zero.");
      return;
    }

    setStep("checking");

    if (mode === "wrap") {
      // Pre-check: does the wallet even hold enough of the underlying ERC-20?
      const balance = await publicClient.readContract({
        address: pair.tokenAddress,
        abi: erc20ReadAbi,
        functionName: "balanceOf",
        args: [address],
      });
      if (balance < parsed) {
        setStep("error");
        setMessage(
          `Insufficient balance — you hold ${formatUnits(balance, decimals)} ${pair.tokenSymbol ?? ""}.`
        );
        return;
      }
    }

    setStep("submitting");
    const result =
      mode === "wrap"
        ? await wrapToken(sdk, pair.confidentialTokenAddress, parsed)
        : await unwrapToken(sdk, pair.confidentialTokenAddress, parsed);

    if (result.status === "ok") {
      setTxHash(result.txHash);
      setStep("done");
      setAvailableBalance((current) => (current == null ? current : current - parsed));
    } else {
      setStep("error");
      setMessage(readableTxError(result.message));
    }
  }

  return (
    <div className="fixed inset-0 bg-secondary/40 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-neutral rounded-lg p-lg w-full max-w-md flex flex-col gap-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <p className="text-headline-sm font-display">
            {pair.tokenSymbol ?? "Token"} ↔ {pair.confidentialSymbol ?? "Confidential"}
          </p>
          <button onClick={onClose} className="text-body-lg" aria-label="Close">
            ×
          </button>
        </div>

        <div className="flex gap-2">
          <Button variant={mode === "wrap" ? "primary" : "secondary"} onClick={() => setMode("wrap")}>
            Wrap
          </Button>
          <Button variant={mode === "unwrap" ? "primary" : "secondary"} onClick={() => setMode("unwrap")}>
            Unwrap
          </Button>
        </div>

        <input
          className="rounded-sm border border-tertiary bg-neutral px-3 py-2 text-body-md"
          placeholder={`Amount (${mode === "wrap" ? pair.tokenSymbol : pair.confidentialSymbol})`}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <div className="flex items-center justify-between text-body-sm text-tertiary">
          <span>
            {balanceState === "loading" && "Loading balance…"}
            {balanceState === "ready" &&
              `Available: ${formatUnits(availableBalance ?? 0n, decimals)} ${
                mode === "wrap" ? pair.tokenSymbol ?? "" : pair.confidentialSymbol ?? ""
              }`}
            {balanceState === "error" &&
              `Couldn't load ${mode === "wrap" ? "wallet" : "confidential"} balance.`}
          </span>
          <button
            className="underline disabled:no-underline disabled:opacity-40"
            type="button"
            disabled={availableBalance == null || balanceState !== "ready"}
            onClick={() => setAmount(formatUnits(availableBalance ?? 0n, decimals))}
          >
            Max
          </button>
        </div>

        <Button onClick={submit} disabled={step === "checking" || step === "submitting"}>
          {step === "checking" && "Checking…"}
          {step === "submitting" && "Confirm in wallet…"}
          {(step === "idle" || step === "error" || step === "done") && (mode === "wrap" ? "Wrap" : "Unwrap")}
        </Button>

        {step === "error" && <p className="text-body-sm text-error">{message}</p>}
        {step === "done" && txHash && (
          <div className="text-body-sm text-secondary">
            <p>
              Submitted —{" "}
              <a
                className="underline"
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                view on Etherscan
              </a>
            </p>
            {mode === "unwrap" && (
              <p className="text-tertiary mt-1">
                Unwrapping burns your confidential balance and requests decryption from Zama's
                network — your {pair.tokenSymbol ?? "ERC-20"} arrives once that resolves, which can
                take a bit longer than a normal transaction. Check your wallet in a moment.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function readableTxError(message: string): string {
  if (/user rejected|denied/i.test(message)) return "You cancelled the transaction.";
  if (/allowance|approve/i.test(message)) return "Approval failed or was rejected — try again.";
  if (/insufficient/i.test(message)) return "Insufficient balance for this amount.";
  if (/not authorized|unauthorized|OwnableUnauthorizedAccount/i.test(message)) {
    return "This token rejected the transaction because your wallet is not authorized for that action.";
  }
  if (/execution reverted|Transaction failed/i.test(message)) return message;
  return message || "Something went wrong submitting this transaction.";
}

// Minimal decimal parse/format so this file has no extra dependency.
function parseUnits(value: string, decimals: number): bigint {
  const [whole, frac = ""] = value.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}
function formatUnits(value: bigint, decimals: number): string {
  const s = value.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals) || "0";
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}
