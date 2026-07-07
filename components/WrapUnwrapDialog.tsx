"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { erc20ReadAbi } from "@/lib/abis";
import { getChainConfig, getExplorerTxUrl } from "@/lib/chains";
import { useZamaSDK } from "@/lib/useZamaSDK";
import { unwrapToken, wrapToken } from "@/lib/zama";
import { Button } from "./Button";
import type { WrapperPair } from "@/lib/registry";
import { Badge } from "./Badge";

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
  const [balanceError, setBalanceError] = useState("");

  const { address } = useAccount();
  const publicClient = usePublicClient();
  const sdk = useZamaSDK(pair.chainId);
  const chain = getChainConfig(pair.chainId);
  const decimals = mode === "wrap" ? pair.tokenDecimals ?? 18 : pair.confidentialDecimals ?? pair.tokenDecimals ?? 18;

  useEffect(() => {
    let cancelled = false;

    async function loadBalance() {
        if (!address || !publicClient) {
          if (!cancelled) {
            setAvailableBalance(null);
            setBalanceState("idle");
            setBalanceError("");
          }
          return;
        }

        setBalanceState("loading");
        setBalanceError("");

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

        if (!sdk) {
          if (!cancelled) {
            setAvailableBalance(null);
            setBalanceState("error");
            setBalanceError("Decrypt signer is not ready yet.");
          }
          return;
        }

        const token = sdk.createToken(pair.confidentialTokenAddress);
        const balance = await token.balanceOf(address);
        if (!cancelled) {
          setAvailableBalance(balance);
          setBalanceState("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setAvailableBalance(null);
          setBalanceState("error");
          setBalanceError(readableBalanceError(err));
        }
      }
    }

    loadBalance();
    setMessage("");
    setStep("idle");

    return () => {
      cancelled = true;
    };
  }, [address, mode, pair.chainId, pair.confidentialTokenAddress, pair.tokenAddress, publicClient, sdk]);

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

    setMessage("");
    setStep("checking");

    try {
      if (mode === "wrap") {
        const balance = await publicClient.readContract({
          address: pair.tokenAddress,
          abi: erc20ReadAbi,
          functionName: "balanceOf",
          args: [address],
        });
        if (balance < parsed) {
          setStep("error");
          setMessage(`Insufficient balance - you hold ${formatUnits(balance, decimals)} ${pair.tokenSymbol ?? ""}.`);
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
        return;
      }

      setStep("error");
      setMessage(readableTxError(result.message));
    } catch (err) {
      setStep("error");
      setMessage(readableTxError(err instanceof Error ? err.message : String(err)));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg border border-tertiary bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[18px] text-fg">
                {pair.tokenSymbol ?? "Token"} <span className="text-tertiary">↔</span> {pair.confidentialSymbol ?? "Confidential"}
              </p>
              <Badge tone="neutral">{chain.shortLabel}</Badge>
            </div>
            <p className="mt-2 text-[14px] text-tertiary">
              {pair.tokenName ?? "Unknown token"} · {pair.label || "Registry pair"}
            </p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-tertiary hover:text-fg" aria-label="Close">
            ×
          </button>
        </div>

        {chain.gasWarning && (
          <div className="mt-4 border border-primary/40 bg-neutral px-4 py-3 text-[14px] leading-6 text-fg">
            {chain.gasWarning}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant={mode === "wrap" ? "primary" : "secondary"} onClick={() => setMode("wrap")}>
            Wrap
          </Button>
          <Button variant={mode === "unwrap" ? "primary" : "secondary"} onClick={() => setMode("unwrap")}>
            Unwrap
          </Button>
        </div>

        <div className="mt-4 border border-tertiary bg-neutral px-4 py-3">
          <label className="text-[11px] uppercase tracking-[0.2em] text-tertiary">Amount</label>
          <div className="mt-2 flex items-center gap-2">
            <input
              className="min-w-0 flex-1 border border-tertiary bg-surface px-3 py-2 font-mono text-[14px] text-fg outline-none"
              placeholder={`Amount (${mode === "wrap" ? pair.tokenSymbol ?? "" : pair.confidentialSymbol ?? ""})`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <button
              className="border border-tertiary px-3 py-2 text-[13px] text-fg hover:bg-surface disabled:opacity-40"
              type="button"
              disabled={availableBalance == null || balanceState !== "ready"}
              onClick={() => setAmount(formatUnits(availableBalance ?? 0n, decimals))}
            >
              Max
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-4 text-[13px] text-tertiary">
            <span>
              {balanceState === "loading" && "Loading balance..."}
              {balanceState === "ready" &&
                `Available: ${formatUnits(availableBalance ?? 0n, decimals)} ${
                  mode === "wrap" ? pair.tokenSymbol ?? "" : pair.confidentialSymbol ?? ""
                }`}
              {balanceState === "error" && (balanceError || `Couldn't load ${mode === "wrap" ? "wallet" : "confidential"} balance.`)}
            </span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={submit}
            disabled={step === "checking" || step === "submitting" || !sdk || !address}
            className="min-w-[140px]"
          >
            {step === "checking" && "Checking..."}
            {step === "submitting" && "Confirm in wallet..."}
            {(step === "idle" || step === "error" || step === "done") && (mode === "wrap" ? "Wrap" : "Unwrap")}
          </Button>
          {step === "done" && txHash && (
            <a
              className="text-body-sm underline underline-offset-2 text-tertiary hover:text-fg"
              href={getExplorerTxUrl(pair.chainId, txHash)}
              target="_blank"
              rel="noreferrer"
            >
              View transaction
            </a>
          )}
        </div>

        {message && (
          <div className="mt-4 border border-tertiary bg-neutral px-4 py-3">
            <p className="text-[14px] leading-6 text-fg">{message}</p>
          </div>
        )}

        {step === "done" && (
          <p className="mt-3 text-[13px] leading-6 text-[rgb(var(--accent-text))]">
            {mode === "unwrap"
              ? `Unwrapping returns the underlying ${pair.tokenSymbol ?? "ERC-20"} to your wallet.`
              : "Submitted successfully. Check your wallet for the confirmation."}
          </p>
        )}
      </div>
    </div>
  );
}

function readableTxError(message: string): string {
  if (/user rejected|denied/i.test(message)) return "Signature rejected by wallet.";
  if (/allowance|approve/i.test(message)) return "Approval failed or was rejected.";
  if (/insufficient/i.test(message)) return "Insufficient balance for this amount.";
  if (/not authorized|unauthorized|OwnableUnauthorizedAccount/i.test(message)) {
    return "This token rejected the transaction because your wallet is not authorized for that action.";
  }
  if (/execution reverted|Transaction failed/i.test(message)) return message;
  return message || "Something went wrong submitting this transaction.";
}

function readableBalanceError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/user rejected|denied|rejected/i.test(message)) return "Balance read was rejected in the wallet.";
  if (/returned no data|0x\)|not a contract|HTTP error! status: 404/i.test(message)) {
    return "This address does not expose confidential balance reads on the active network.";
  }
  return "Couldn't load the balance for this token.";
}

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
