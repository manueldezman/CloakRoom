"use client";

import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { DEFAULT_CHAIN_ID, isSupportedChainId } from "@/lib/chains";
import { useZamaSDK } from "@/lib/useZamaSDK";
import { decryptBalance, type DecryptResult, getTokenDisplayMetadata } from "@/lib/zama";
import { Button } from "./Button";
import { Badge } from "./Badge";

type RevealState = "hidden" | "decrypting" | "revealed" | "error";

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
        setErrorTone("Signature rejected by wallet. Balance stays hidden.");
        setState("error");
        break;
      case "no-acl-grant":
        setErrorTone("This wallet has not been granted access to decrypt this balance.");
        setState("error");
        break;
      case "not-erc7984":
        setErrorTone("This address is not a readable ERC-7984 token on the active network.");
        setState("error");
        break;
      case "unknown-error":
        setErrorTone(result.message || "Couldn't decrypt right now. Try again.");
        setState("error");
        break;
    }
  }

  useEffect(() => {
    if (!autoReveal) return;
    if (!sdk || !address) return;
    void reveal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReveal, tokenAddress, sdk, address]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 border border-tertiary bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-[15px] text-fg">{label}</p>
          <p className="font-mono text-[13px] text-tertiary">{shorten(tokenAddress)}</p>
        </div>

        <div className="flex items-center gap-3">
          {state === "hidden" && <Badge tone="neutral">Encrypted</Badge>}
          {state === "decrypting" && <Badge tone="neutral">Decrypting...</Badge>}
          {state === "revealed" && (
            <span className="font-mono text-[15px]">
              {formatUnits(value ?? 0n, decimals ?? 18)} {symbol ?? ""}
            </span>
          )}

          {!autoReveal && (
            <Button
              variant="secondary"
              onClick={reveal}
              disabled={!isConnected || !sdk || state === "decrypting"}
            >
              {state === "revealed" ? "Refresh" : "Decrypt"}
            </Button>
          )}
        </div>
      </div>
      {state === "error" && (
        <div className="border border-error/40 bg-surface px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-error">Decrypt failed</p>
          <p className="mt-1 text-[14px] leading-6 text-error">{errorTone}</p>
        </div>
      )}
    </div>
  );
}

export function ArbitraryDecryptPanel() {
  const [input, setInput] = useState("");
  const [activeAddress, setActiveAddress] = useState<`0x${string}` | null>(null);
  const [activeLabel, setActiveLabel] = useState("Custom token");
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
  const [checkedAddress, setCheckedAddress] = useState<`0x${string}` | null>(null);
  const [inspectError, setInspectError] = useState("");
  const { chainId } = useAccount();
  const publicClient = usePublicClient();
  const supportedChainId = isSupportedChainId(chainId) ? chainId : DEFAULT_CHAIN_ID;
  const sdk = useZamaSDK(supportedChainId);

  async function inspect() {
    const tokenAddress = input as `0x${string}`;
    setInspectError("");
    setCheckedAddress(null);
    setActiveAddress(null);
    setActiveLabel("Inspecting...");
    setActiveSymbol(null);

    if (!publicClient) {
      setInspectError("Wallet RPC is not ready yet.");
      setActiveLabel("Custom token");
      return;
    }

    try {
      const metadata = await getTokenDisplayMetadata(publicClient, tokenAddress);
      if (!metadata.name && !metadata.symbol) {
        setInspectError("This address does not look like an ERC-7984 contract on the active network.");
        setActiveLabel("Custom token");
        setCheckedAddress(null);
        return;
      }
      setActiveLabel(metadata.name || "Custom token");
      setActiveSymbol(metadata.symbol ?? null);
      setActiveAddress(tokenAddress);
    } catch (err: any) {
      const message = err?.shortMessage ?? err?.message ?? String(err);
      setInspectError(readableInspectError(message));
      setActiveLabel("Custom token");
      setCheckedAddress(null);
    }
  }

  useEffect(() => {
    if (!checkedAddress || !sdk) return;
    setActiveAddress(checkedAddress);
  }, [checkedAddress, sdk]);

  return (
    <div className="border border-tertiary bg-surface px-5 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[18px] text-fg">// DECRYPT</p>
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-tertiary">
            Paste any ERC-7984 contract address on the active network. The app will load its metadata and try to
            decrypt your balance with the normal EIP-712 flow.
          </p>
        </div>
        <Badge tone="neutral">{isSupportedChainId(chainId) ? (chainId === 1 ? "Mainnet" : "Sepolia") : "Unsupported"}</Badge>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-2">
          <span className="text-[11px] uppercase tracking-[0.2em] text-tertiary">Token address</span>
          <input
            className="h-11 w-full border border-tertiary bg-neutral px-4 font-mono text-[14px] text-fg outline-none"
            placeholder="0x..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value.trim());
              setInspectError("");
              setCheckedAddress(null);
              setActiveAddress(null);
            }}
          />
        </label>
        <Button onClick={inspect} disabled={!/^0x[a-fA-F0-9]{40}$/.test(input)} className="w-full">
          Decrypt
        </Button>
      </div>

      {inspectError && (
        <div className="mt-3 flex items-start gap-3 border border-tertiary bg-neutral px-4 py-3">
          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center border border-error/60 font-mono text-[12px] leading-none text-error">
            !
          </span>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-tertiary">Token not supported</p>
            <p className="mt-1 text-[14px] leading-6 text-fg">{inspectError}</p>
            <p className="mt-2 text-[13px] leading-5 text-tertiary">
              Paste a confidential ERC-7984 token address on the active network. Plain ERC-20 token addresses cannot be decrypted here.
            </p>
          </div>
        </div>
      )}

      <p className="mt-3 text-[13px] text-tertiary">
        Decrypt balances for any ERC-7984 address on the active network.
      </p>

      {activeAddress && (
        <div className="mt-4">
          <div className="border border-tertiary bg-neutral px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-tertiary">Checked token</p>
            <p className="mt-1 font-mono text-[14px] text-fg">
              {activeLabel} {activeSymbol ? <span className="text-tertiary">({activeSymbol})</span> : null}
            </p>
            <p className="mt-1 font-mono text-[13px] text-tertiary">{activeAddress}</p>
          </div>
          <div className="mt-3">
            <DecryptRow
              tokenAddress={activeAddress}
              label={activeLabel}
              symbol={activeSymbol}
              autoReveal
              key={activeAddress}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function readableInspectError(message: string) {
  if (/returned no data|0x\)|address is not a contract|function \"confidentialBalanceOf\"/i.test(message)) {
    return "This address does not expose ERC-7984 reads on the active network.";
  }
  if (/network|chain|wrong/i.test(message)) {
    return "Wrong network for this token address.";
  }
  return message || "Couldn't inspect this token right now.";
}

function formatUnits(value: bigint, decimals: number): string {
  const s = value.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, -decimals) || "0";
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole;
}
