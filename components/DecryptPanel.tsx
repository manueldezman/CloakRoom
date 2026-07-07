"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useZamaSDK } from "@/lib/useZamaSDK";
import { decryptBalance, DecryptResult, getTokenDisplayMetadata } from "@/lib/zama";
import { Button } from "./Button";
import { Badge } from "./Badge";

type RevealState = "hidden" | "decrypting" | "revealed" | "error";

/**
 * One row: a lock icon by default (never a bare "0" — an undisclosed
 * encrypted amount is not the same thing as a zero balance), a reveal
 * button that triggers the EIP-712 signature + relayer round trip.
 */
export function DecryptRow({
  tokenAddress,
  label,
  symbol,
  decimals,
  autoReveal = false,
}: {
  tokenAddress: `0x${string}`;
  label: string;
  symbol?: string | null;
  decimals?: number | null;
  autoReveal?: boolean;
}) {
  const sdk = useZamaSDK();
  const { isConnected, address } = useAccount();
  const [state, setState] = useState<RevealState>("hidden");
  const [value, setValue] = useState<bigint | null>(null);
  const [errorTone, setErrorTone] = useState<string>("");

  async function reveal() {
    if (!sdk || !address) return;
    setErrorTone("");
    setState("decrypting");
    const result: DecryptResult = await decryptBalance(sdk, tokenAddress, address);
    switch (result.status) {
      case "ok":
        setValue(result.value);
        setState("revealed");
        break;
      case "denied":
        setErrorTone("You declined the signature request — balance stays hidden.");
        setState("error");
        break;
      case "no-acl-grant":
        setErrorTone("This wallet hasn't been granted access to decrypt this balance.");
        setState("error");
        break;
      case "not-erc7984":
        setErrorTone(
          "This address is not a readable ERC-7984 token on Sepolia. Make sure you pasted the confidential token address, not an ERC-20 or a mainnet address."
        );
        setState("error");
        break;
      case "unknown-error":
        setErrorTone(result.message || "Couldn't decrypt right now — try again.");
        setState("error");
        break;
    }
  }

  useEffect(() => {
    if (!autoReveal) return;
    if (!sdk || !address) return;
    void reveal();
  }, [autoReveal, tokenAddress, sdk, address]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between rounded-md border border-tertiary bg-surface px-md py-sm">
        <div>
          <p className="text-label-lg">{label}</p>
          <p className="text-body-sm text-tertiary font-mono">{shorten(tokenAddress)}</p>
        </div>

        <div className="flex items-center gap-3">
          {state === "hidden" && <Badge tone="neutral">🔒 Encrypted</Badge>}
          {state === "decrypting" && <Badge tone="neutral">Decrypting…</Badge>}
          {state === "revealed" && (
            <span className="text-label-lg font-mono">
              {formatUnits(value ?? 0n, decimals ?? 18)} {symbol ?? ""}
            </span>
          )}

          {!autoReveal && (
            <Button
              variant="secondary"
              onClick={reveal}
              disabled={!isConnected || !sdk || state === "decrypting"}
            >
              {state === "revealed" ? "Refresh" : "Reveal"}
            </Button>
          )}
        </div>
      </div>
      {state === "error" && (
        <div className="rounded-md border border-error bg-white px-md py-sm">
          <div className="flex items-start gap-2">
            <span className="text-error text-body-md leading-none">!</span>
            <div className="flex flex-col gap-1">
              <p className="text-label-sm text-error">Decrypt failed</p>
              <p className="text-body-sm text-error">{errorTone}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** "Paste an address" flow — decrypt any ERC-7984 balance, registry or not. */
export function ArbitraryDecryptPanel() {
  const [input, setInput] = useState("");
  const [activeAddress, setActiveAddress] = useState<`0x${string}` | null>(null);
  const [activeLabel, setActiveLabel] = useState("Custom address");
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const sdk = useZamaSDK();

  async function checkAddress() {
    const tokenAddress = input as `0x${string}`;
    setActiveAddress(tokenAddress);

    if (!sdk) {
      setActiveLabel("Custom address");
      setActiveSymbol(null);
      return;
    }

    const metadata = await getTokenDisplayMetadata(sdk, tokenAddress);
    setActiveLabel(metadata.name || "Custom address");
    setActiveSymbol(metadata.symbol ?? null);
  }

  return (
    <div className="rounded-lg border border-tertiary p-md flex flex-col gap-sm">
      <p className="text-headline-sm font-display">Decrypt any ERC-7984 balance</p>
      <p className="text-body-sm text-tertiary">
        Not just registry tokens — paste any ERC-7984 contract address to check your balance on it.
      </p>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-sm border border-tertiary bg-neutral px-3 py-2 text-body-md font-mono"
          placeholder="0x…"
          value={input}
          onChange={(e) => setInput(e.target.value.trim())}
        />
        <Button onClick={checkAddress} disabled={!/^0x[a-fA-F0-9]{40}$/.test(input)}>
          Decrypt
        </Button>
      </div>
      {activeAddress && (
        <DecryptRow
          tokenAddress={activeAddress}
          label={activeLabel}
          symbol={activeSymbol}
          autoReveal
          key={activeAddress}
        />
      )}
    </div>
  );
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatUnits(value: bigint, decimals: number): string {
  const s = value.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals) || "0";
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}
