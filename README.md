# Confidential Wrapper Registry

A dApp that turns the official [Zama Confidential Token Wrappers Registry](https://docs.zama.org/protocol/protocol-apps/registry-contract)
into a single, usable product: browse every official ERC-20 ↔ ERC-7984 pair on
Sepolia, wrap and unwrap between them, decrypt any ERC-7984 balance in your
wallet, and claim the official test tokens from the faucet — all from one page.

**Why this exists:** today, teams building on FHEVM tend to spin up their own
ERC-20 test tokens and their own ERC-7984 wrappers instead of using the ones
that already exist in Zama's official registry. That fragments the ecosystem —
every integration targets a slightly different set of tokens. This app makes
using the existing, official wrappers the path of least resistance.

**Live URL:** _add your deployed Vercel URL here_
**Network:** Sepolia only (11155111)

---

## How the registry is sourced (hybrid)

This app reads pairs from two places and merges them:

1. **Onchain (source of truth):** `lib/registry.ts` now uses the SDK's built-in
   `WrappersRegistry` wrapper to read official pairs and token metadata from
   the registry contract, then filters out revoked (`isValid === false`)
   entries before showing them in the UI.
2. **Local config:** `lib/pairs.local.json` — dev-only or custom pairs, for
   testing wrappers that aren't in the official registry yet.

Official entries always take priority over a local entry for the same
underlying ERC-20 address. Every pair in the UI is labeled **Official** or
**Custom** so it's never ambiguous which is which.

## How to add a new pair

Add an entry to `lib/pairs.local.json`:

```json
{
  "tokenAddress": "0xYourErc20Address",
  "confidentialTokenAddress": "0xYourErc7984WrapperAddress",
  "label": "My Dev Token",
  "network": "sepolia"
}
```

Open a PR. `.github/workflows/validate-pairs.yml` automatically runs
`npm run validate-pairs` (`scripts/validate-pairs.ts`), which checks against
live Sepolia that:

- your `confidentialTokenAddress` actually implements ERC-7984, and
- your `tokenAddress` isn't already an official registry pair (it should
  never shadow one).

The PR check fails if either condition isn't met, so a bad entry can't merge.
This is the same validation logic the app itself runs when reading the
registry, just executed as a CI script instead of in the browser.

## Running locally

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev
```

Required environment variables (see `.env.example`):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Sepolia RPC endpoint (Infura/Alchemy) |
| `NEXT_PUBLIC_REGISTRY_ADDRESS` | Official registry address — **verify against [the current docs](https://docs.zama.org/protocol/protocol-apps/addresses) before use** |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | From [cloud.walletconnect.com](https://cloud.walletconnect.com) |
| `ZAMA_RELAYER_URL` | Zama's hosted Sepolia relayer — kept server-side, proxied via `app/api/relayer/[chainId]/route.ts` |

## Architecture

```
app/
  page.tsx                 — main page: pair list + arbitrary decrypt
  providers.tsx             — wagmi + RainbowKit + React Query
  api/relayer/[chainId]/    — server-side proxy to Zama's relayer (keeps keys off the client)
lib/
  registry.ts               — SDK-backed registry reads + local-pair enrichment
  zama.ts                   — Zama SDK singleton + wrap/unwrap/decrypt helpers
  pairs.local.json          — custom/dev pairs (the extensibility mechanism above)
  abis.ts                   — minimal hand-picked ABI fragments (no full-contract ABIs needed)
components/
  PairList / PairCard       — registry browsing UI
  WrapUnwrapDialog          — wrap/unwrap flow with pre-flight balance checks
  DecryptPanel              — per-token reveal UI + "paste an address" arbitrary decrypt
  FaucetButton              — plain ERC-20 mint call against official cTokenMocks
scripts/validate-pairs.ts   — CI validation for new custom pairs
```

## Wrap / unwrap / decrypt, in one paragraph

Wrapping deposits your plain ERC-20 as collateral in the wrapper contract and
mints you an encrypted ERC-7984 balance of the same amount; unwrapping burns
the encrypted balance and releases your ERC-20 back. Balances on ERC-7984
tokens are ciphertext handles — not human-readable numbers — until you
explicitly request decryption, which requires signing an EIP-712 message with
your wallet to prove you're authorized to see that value. The Zama SDK
(`@zama-fhe/sdk`) handles the approval sequence, the encryption of amounts,
and the EIP-712 signature flow; this app is a UI layer on top of it.

## Error handling

- **Wrong network:** a banner appears with a one-click switch to Sepolia
  whenever the connected wallet is on a different chain.
- **Insufficient balance / missing approval:** checked before submitting a
  wrap, with a specific message rather than a raw revert.
- **Unsupported / malformed token:** custom pairs still get a live ERC-7984
  compatibility check before wrap/unwrap is enabled.
- **Decryption denied / no ACL grant / not ERC-7984:** each surfaces as a
  distinct, specific message in the decrypt panel rather than a generic error.

## Verification status (read before demo day)

This scaffold was corrected against the **actual installed package's type
definitions** (`node_modules/@zama-fhe/sdk/dist/esm/index.d.ts`) on
2026-07-07 — ground truth, not docs, since this SDK's documented API shape
changed more than once during this project's development. Confirmed from the
real types:

- `createToken` and `createWrappedToken` are **both real, for different
  purposes**: `createToken` returns a generic `Token` (used for arbitrary
  ERC-7984 decrypt), `createWrappedToken` returns a `WrappedToken` (used for
  `shield`/`unshield` on registry wrapper contracts specifically).
- The SDK exports `DefaultRegistryAddresses` directly — `lib/chains.ts` now
  sources the official Sepolia registry address from the SDK itself instead
  of requiring a manually-verified env var. `NEXT_PUBLIC_REGISTRY_ADDRESS` is
  now an optional override, not a requirement.
- `ERC7984_WRAPPER_INTERFACE_ID` and `ERC7984_INTERFACE_ID` are separate
  constants, both exported by the SDK. The app still uses the wrapper-specific
  ID for live validation of custom pairs in `lib/registry.ts`.
- Unwrap is confirmed genuinely two-step and event-tracked at the type level
  (`UnwrapRequestedEvent`, `UnwrapFinalizedEvent`, plus
  `loadPendingUnshieldRequest`/`savePendingUnshield`/`clearPendingUnshield`
  for surviving a page reload mid-unwrap). `unshield()` likely resolves once
  the request is *submitted*, not once it's *finalized* — a good next
  improvement is wiring up `loadPendingUnshieldRequest` to show a persistent
  "unwrap pending" banner rather than assuming completion on tx confirmation.

Still worth confirming on a live testnet run:

- **Faucet mint signature is assumed**, not confirmed: `lib/abis.ts` assumes
  `mint(address to, uint256 amount)` on the official cTokenMocks. Check the
  verified source of an actual cTokenMock on Sepolia Etherscan before relying
  on this.
- **SDK package is unpinned** (`"latest"` in `package.json`) — once you've
  tested against a working version, pin it exactly.

