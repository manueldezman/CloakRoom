"use client";

import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction, type SVGProps } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useSwitchChain } from "wagmi";
import {
  DEFAULT_CHAIN_ID,
  getChainConfig,
  isSupportedChainId,
  type SupportedChainId,
} from "@/lib/chains";
import { useImportedPairs } from "@/lib/useImportedPairs";
import { usePairs } from "@/lib/usePairs";
import { useThemePreference } from "@/lib/useTheme";
import { PairList } from "./PairList";
import { NetworkBanner } from "./NetworkBanner";
import { ArbitraryDecryptPanel } from "./DecryptPanel";
import { FaucetButton } from "./FaucetButton";
import { Button } from "./Button";
import { Badge } from "./Badge";
import type { ImportedPair, WrapperPair } from "@/lib/registry";

type ImportForm = {
  chainId: SupportedChainId;
  tokenAddress: string;
  confidentialTokenAddress: string;
  label: string;
};

type EditablePair = Pick<WrapperPair, "chainId" | "tokenAddress" | "confidentialTokenAddress" | "label">;

const initialImportForm = (chainId: SupportedChainId): ImportForm => ({
  chainId,
  tokenAddress: "",
  confidentialTokenAddress: "",
  label: "",
});

export function Dashboard() {
  const { chainId, isConnected } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const supportedChainId = isSupportedChainId(chainId) ? chainId : DEFAULT_CHAIN_ID;
  const chain = getChainConfig(supportedChainId);
  const blocked = isConnected && !isSupportedChainId(chainId);
  const { themePreference, resolvedTheme, setThemePreference } = useThemePreference();
  const imported = useImportedPairs(supportedChainId);
  const [form, setForm] = useState<ImportForm>(initialImportForm(supportedChainId));
  const [editing, setEditing] = useState<EditablePair | null>(null);
  const [addPairOpen, setAddPairOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  const activeImported = imported.activePairs;

  useEffect(() => {
    if (editing) return;
    setForm((current) => ({ ...initialImportForm(supportedChainId), chainId: supportedChainId, label: current.label }));
  }, [supportedChainId, editing]);

  const statusCards = useMemo(
    () => [
      { label: "Network", value: chain.shortLabel },
      { label: "FHE status", value: chain.faucetEnabled ? "Operational" : "Operational" },
      { label: "ZK coprocessor", value: isConnected ? "Ready" : "Connect wallet" },
      { label: "Block", value: "Live" },
      { label: "Theme", value: themePreference === "system" ? `System / ${resolvedTheme}` : themePreference },
    ],
    [chain.shortLabel, chain.faucetEnabled, isConnected, resolvedTheme, themePreference]
  );

  function handleEdit(pair: EditablePair) {
    setEditing(pair);
    setAddPairOpen(true);
    setForm({
      chainId: pair.chainId,
      tokenAddress: pair.tokenAddress,
      confidentialTokenAddress: pair.confidentialTokenAddress,
      label: pair.label ?? "",
    });
  }

  function resetForm() {
    setEditing(null);
    setForm(initialImportForm(supportedChainId));
    setAddPairOpen(false);
  }

  function submitImport() {
    if (!/^0x[a-fA-F0-9]{40}$/.test(form.tokenAddress) || !/^0x[a-fA-F0-9]{40}$/.test(form.confidentialTokenAddress)) {
      setSaveError("Enter valid underlying and confidential token addresses.");
      return;
    }
    if (!form.tokenAddress || !form.confidentialTokenAddress) {
      setSaveError("Add both token addresses before saving.");
      return;
    }
    imported.savePair(
      {
        chainId: form.chainId,
        tokenAddress: form.tokenAddress as `0x${string}`,
        confidentialTokenAddress: form.confidentialTokenAddress as `0x${string}`,
        label: form.label.trim() || undefined,
      },
      editing?.tokenAddress
    );
    setSaveError("");
    setSaveStatus(editing ? "Pair updated." : "Pair imported locally.");
    resetForm();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1520px] flex-col px-4 py-5 md:px-6 xl:px-0">
      <header className="border border-tertiary bg-surface/90 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="shrink-0 font-mono text-[22px] leading-none tracking-[0.12em] text-[rgb(var(--accent-text))]">ZAMA</div>
          </div>

          <div className="flex shrink-0 items-center gap-2 xl:gap-3">
            <TopNav />
            <div className="flex items-center border border-tertiary bg-neutral p-1">
              <ThemeButton
                active={themePreference === "light"}
                label="Light theme"
                onClick={() => setThemePreference("light")}
              >
                <SunIcon />
              </ThemeButton>
              <ThemeButton
                active={themePreference === "dark"}
                label="Dark theme"
                onClick={() => setThemePreference("dark")}
              >
                <MoonIcon />
              </ThemeButton>
              <ThemeButton
                active={themePreference === "system"}
                label="System theme"
                onClick={() => setThemePreference("system")}
              >
                <MonitorIcon />
              </ThemeButton>
            </div>
            <div className="border border-tertiary bg-neutral px-2 py-1">
              <ConnectButton showBalance={false} />
            </div>
          </div>
        </div>
      </header>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
        <div className="border border-tertiary bg-surface px-6 py-6 md:px-8 md:py-8">
          <p className="font-mono text-[13px] uppercase tracking-[0.34em] text-tertiary">Confidential wrapper registry</p>
          <h1 className="mt-5 max-w-3xl font-mono text-[clamp(3.1rem,5vw,5.2rem)] leading-[0.92] tracking-[-0.05em] text-fg">
            CONFIDENTIAL
            <br />
            WRAPPER REGISTRY_
          </h1>
          <p className="mt-5 max-w-xl text-[18px] leading-7 text-tertiary">
            Wrap public tokens into confidential assets with Zama FHE.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={() => void switchChainAsync({ chainId: supportedChainId }).catch(() => null)}
              disabled={!isConnected || isPending}
            >
              {isPending ? "Switching..." : `Use ${chain.shortLabel}`}
            </Button>
            <a
              className="inline-flex h-10 items-center justify-center rounded-[2px] border border-tertiary px-4 font-mono text-[14px] text-fg hover:bg-neutral"
              href="#registry"
            >
              View registry
            </a>
          </div>
        </div>

        <div className="grid gap-3 border border-tertiary bg-surface px-4 py-4 md:px-5">
          {statusCards.map((card) => (
            <StatusRow key={card.label} label={card.label} value={card.value} />
          ))}
          <div className="border border-tertiary bg-neutral px-4 py-4">
            <p className="font-mono text-[13px] uppercase tracking-[0.22em] text-tertiary">Explorer</p>
            <p className="mt-2 text-[15px] leading-6 text-fg">{chain.label} links resolve against the active network explorer.</p>
          </div>
        </div>
      </section>

      <NetworkBanner />

      <div className={blocked ? "pointer-events-none opacity-50" : ""}>
        <section id="registry" className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-tertiary pb-3">
            <div>
              <p className="font-mono text-[13px] uppercase tracking-[0.34em] text-tertiary">Registered pairs</p>
              <h2 className="mt-2 font-mono text-[28px] leading-none text-fg">Official + local registry pairs</h2>
            </div>
            <div className="flex items-center gap-3">
              {chain.faucetEnabled && (
                <button
                  className="border border-[rgb(var(--accent-text))] bg-primary px-3 py-2 font-mono text-[13px] uppercase tracking-[0.14em] text-secondary shadow-[0_0_0_1px_rgb(var(--primary)/0.14)_inset] hover:bg-primary/80"
                  onClick={() => {
                    setEditing(null);
                    setSaveError("");
                    setSaveStatus("");
                    setForm(initialImportForm(supportedChainId));
                    setAddPairOpen(true);
                  }}
                >
                  + Add Pair
                </button>
              )}
              <Badge tone="neutral">{chain.label}</Badge>
            </div>
          </div>
          <div className="mt-4">
            <PairList
              chainId={supportedChainId}
              importedPairs={imported.activePairs}
              onEditImportedPair={handleEdit}
              onRemoveImportedPair={(pair) => imported.removePair(pair.chainId, pair.tokenAddress)}
            />
          </div>
        </section>

        <section id="custom" className={`mx-auto mt-8 grid w-full max-w-[1140px] gap-4 ${chain.faucetEnabled ? "xl:grid-cols-2" : ""}`}>
          <ArbitraryDecryptPanel />
          {chain.faucetEnabled && (
            <FaucetUtilityPanel
              chainId={supportedChainId}
              importedPairs={imported.activePairs}
              chainLabel={chain.label}
            />
          )}
        </section>

        {addPairOpen && (
          <AddPairDialog
            activeImported={activeImported}
            editing={editing}
            form={form}
            saveError={saveError}
            saveStatus={saveStatus}
            onClose={resetForm}
            onEdit={handleEdit}
            onRemove={(pair) => imported.removePair(pair.chainId, pair.tokenAddress)}
            onSubmit={submitImport}
            onChange={setForm}
          />
        )}

        <footer className="mt-8 border-t border-tertiary py-5 text-center text-[13px] text-fg/80">
          Made with love by{" "}
          <a className="font-medium underline underline-offset-4 hover:text-fg" href="https://x.com/0xdezman" target="_blank" rel="noreferrer">
            0xDezman
          </a>{" "}
          for Zama
        </footer>
      </div>
    </main>
  );
}

function TopNav() {
  return (
    <nav className="hidden items-center gap-4 font-mono text-[12px] uppercase tracking-[0.18em] text-tertiary xl:flex">
      <a className="hover:text-fg" href="#registry">
        / registry
      </a>
      <a className="hover:text-fg" href="#custom">
        / tokens
      </a>
      <a className="hover:text-fg" href="https://docs.zama.ai/" target="_blank" rel="noreferrer">
        / docs
      </a>
      <a className="hover:text-fg" href="https://zama.ai/" target="_blank" rel="noreferrer">
        / about
      </a>
    </nav>
  );
}

function ThemeButton({
  active,
  label,
  children,
  onClick,
}: {
  active: boolean;
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid h-8 w-8 place-items-center rounded-[2px] border text-fg transition-colors ${
        active ? "border-primary bg-primary text-secondary" : "border-transparent bg-transparent hover:border-tertiary hover:bg-neutral"
      }`}
    >
      {children}
    </button>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  const highlighted = /operational|ready/i.test(value);
  return (
    <div className="flex items-center justify-between gap-4 border border-tertiary bg-neutral px-4 py-4">
      <span className="font-mono text-[13px] uppercase tracking-[0.2em] text-[rgb(var(--accent-text))]">{label}</span>
      <span className={`font-mono text-[15px] ${highlighted ? "text-[rgb(var(--accent-text))]" : "text-fg"}`}>{value}</span>
    </div>
  );
}

function FaucetUtilityPanel({
  chainId,
  importedPairs,
  chainLabel,
}: {
  chainId: SupportedChainId;
  importedPairs: ImportedPair[];
  chainLabel: string;
}) {
  const { address } = useAccount();
  const { data: pairs, isLoading } = usePairs(chainId, importedPairs);
  const { data: gasBalance, isLoading: isGasBalanceLoading } = useBalance({ address, chainId });
  const [selectedToken, setSelectedToken] = useState<`0x${string}` | "">("");
  const faucetPairs = pairs ?? [];
  const selectedPair = faucetPairs.find((pair) => pair.tokenAddress === selectedToken) ?? faucetPairs[0];
  const needsGas = Boolean(address && !isGasBalanceLoading && gasBalance?.value === 0n);

  useEffect(() => {
    if (faucetPairs.length === 0) return;
    if (selectedToken && faucetPairs.some((pair) => pair.tokenAddress === selectedToken)) return;
    setSelectedToken(faucetPairs[0].tokenAddress);
  }, [faucetPairs, selectedToken]);

  return (
    <div className="border border-tertiary bg-surface px-5 py-5">
      <p className="font-mono text-[18px] text-fg">// FAUCET</p>
      <p className="mt-2 max-w-xl text-[14px] leading-6 text-tertiary">
        Select an ERC-20 test token, claim it, then wrap it from the matching card on {chainLabel}.
      </p>
      {needsGas && (
        <div className="mt-4 border border-[rgb(var(--accent-text))] bg-neutral px-4 py-3">
          <p className="font-mono text-[13px] uppercase tracking-[0.18em] text-[rgb(var(--accent-text))]">Gas required</p>
          <p className="mt-2 text-[14px] leading-6 text-tertiary">
            This wallet has no Sepolia ETH. Claim test ETH first, then return here to mint tokens.
          </p>
          <a
            className="mt-3 inline-flex border border-[rgb(var(--accent-text))] bg-primary px-3 py-2 font-mono text-[13px] uppercase tracking-[0.1em] text-secondary hover:bg-primary/80"
            href="https://sepoliafaucet.com/"
            target="_blank"
            rel="noreferrer"
          >
            Get Sepolia ETH
          </a>
        </div>
      )}
      <div className="mt-5 grid gap-3 border border-tertiary bg-neutral px-4 py-4">
        <label className="grid gap-2">
          <span className="font-mono text-[13px] uppercase tracking-[0.18em] text-tertiary">Token</span>
          <select
            className="h-11 w-full border border-tertiary bg-surface px-3 font-mono text-[14px] text-fg outline-none"
            value={selectedPair?.tokenAddress ?? ""}
            disabled={isLoading || faucetPairs.length === 0}
            onChange={(event) => setSelectedToken(event.target.value as `0x${string}`)}
          >
            {faucetPairs.length === 0 && <option value="">No faucet tokens found</option>}
            {faucetPairs.map((pair) => (
              <option key={pair.tokenAddress} value={pair.tokenAddress}>
                {pair.tokenSymbol ?? "Token"}{pair.tokenName ? ` - ${pair.tokenName}` : ""}
              </option>
            ))}
          </select>
        </label>

        {selectedPair ? (
          <FaucetButton
            tokenAddress={selectedPair.tokenAddress}
            tokenSymbol={selectedPair.tokenSymbol}
            tokenDecimals={selectedPair.tokenDecimals}
            buttonLabel="Claim token"
          />
        ) : (
          <p className="text-[14px] text-tertiary">{isLoading ? "Loading faucet tokens..." : "No faucet token available."}</p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[13px] text-tertiary">
        <span>Need gas first?</span>
        <a
          className="font-mono text-[rgb(var(--accent-text))] underline underline-offset-4 hover:text-fg"
          href="https://sepoliafaucet.com/"
          target="_blank"
          rel="noreferrer"
        >
          Get Sepolia ETH
        </a>
      </div>
    </div>
  );
}

function AddPairDialog({
  activeImported,
  editing,
  form,
  saveError,
  saveStatus,
  onClose,
  onEdit,
  onRemove,
  onSubmit,
  onChange,
}: {
  activeImported: ImportedPair[];
  editing: EditablePair | null;
  form: ImportForm;
  saveError: string;
  saveStatus: string;
  onClose: () => void;
  onEdit: (pair: ImportedPair) => void;
  onRemove: (pair: ImportedPair) => void;
  onSubmit: () => void;
  onChange: Dispatch<SetStateAction<ImportForm>>;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-secondary/65 px-4 py-8 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto border border-tertiary bg-surface p-5 shadow-[0_24px_80px_rgb(0_0_0/0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-tertiary pb-4">
          <div>
            <p className="font-mono text-[18px] text-fg">// ADD PAIR</p>
            <p className="mt-2 max-w-xl text-[14px] leading-6 text-tertiary">
              Save a local dev/private pair to this browser. It stays scoped to the selected chain and does not propose
              anything publicly.
            </p>
          </div>
          <button className="font-mono text-[18px] text-tertiary hover:text-fg" onClick={onClose} aria-label="Close add pair">
            ×
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <Field label="Chain">
            <select
              className="h-11 w-full border border-tertiary bg-neutral px-3 font-mono text-[14px] text-fg outline-none"
              value={form.chainId}
              onChange={(e) =>
                onChange((current) => ({
                  ...current,
                  chainId: Number(e.target.value) as SupportedChainId,
                }))
              }
            >
              <option value={1}>Mainnet</option>
              <option value={11155111}>Sepolia</option>
            </select>
          </Field>
          <Field label="Underlying token">
            <input
              className="h-11 w-full border border-tertiary bg-neutral px-3 font-mono text-[14px] text-fg outline-none"
              value={form.tokenAddress}
              onChange={(e) => onChange((current) => ({ ...current, tokenAddress: e.target.value.trim() }))}
              placeholder="0x..."
            />
          </Field>
          <Field label="Confidential token">
            <input
              className="h-11 w-full border border-tertiary bg-neutral px-3 font-mono text-[14px] text-fg outline-none"
              value={form.confidentialTokenAddress}
              onChange={(e) => onChange((current) => ({ ...current, confidentialTokenAddress: e.target.value.trim() }))}
              placeholder="0x..."
            />
          </Field>
          <Field label="Label">
            <input
              className="h-11 w-full border border-tertiary bg-neutral px-3 text-[14px] text-fg outline-none"
              value={form.label}
              onChange={(e) => onChange((current) => ({ ...current, label: e.target.value }))}
              placeholder="Optional label"
            />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onSubmit}>{editing ? "Update pair" : "Save pair"}</Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>

        {saveError && <p className="mt-3 text-[14px] text-error">{saveError}</p>}
        {saveStatus && <p className="mt-3 text-[14px] text-[rgb(var(--accent-text))]">{saveStatus}</p>}

        <div className="mt-6 border-t border-tertiary pt-4">
          <p className="font-mono text-[13px] uppercase tracking-[0.24em] text-tertiary">Imported on this chain</p>
          <div className="mt-3 space-y-2">
            {activeImported.length === 0 && <p className="text-[14px] text-tertiary">No imported pairs yet.</p>}
            {activeImported.map((pair) => (
              <div key={`${pair.chainId}-${pair.tokenAddress}`} className="border border-tertiary bg-neutral px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[15px] text-fg">{pair.label || "Imported pair"}</p>
                    <p className="mt-1 truncate font-mono text-[13px] text-tertiary">{pair.tokenAddress}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="text-[13px] underline underline-offset-4 hover:text-fg" onClick={() => onEdit(pair)}>
                      Edit
                    </button>
                    <button
                      className="text-[13px] underline underline-offset-4 text-error hover:opacity-80"
                      onClick={() => onRemove(pair)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="font-mono text-[13px] uppercase tracking-[0.2em] text-tertiary">{label}</span>
      {children}
    </label>
  );
}

function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v2.4M12 18.8v2.4M4.2 4.2l1.7 1.7M18.1 18.1l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.2 19.8l1.7-1.7M18.1 5.9l1.7-1.7" />
    </svg>
  );
}

function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" {...props}>
      <path d="M16.7 14.2A7.2 7.2 0 0 1 9.8 7.3c0-1 .2-1.9.5-2.8A8.2 8.2 0 1 0 19.5 16c-.8.3-1.7.4-2.8.4z" />
    </svg>
  );
}

function MonitorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" {...props}>
      <rect x="4.2" y="5" width="15.6" height="10.8" rx="1.8" />
      <path d="M9 18.8h6M12 15.8v3" />
    </svg>
  );
}
