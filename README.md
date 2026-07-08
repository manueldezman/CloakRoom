# Zama cToken Registry

A protocol dashboard for the Zama Wrappers Registry. The app lets users browse official ERC-20 ↔ ERC-7984 pairs, wrap and unwrap on Sepolia and mainnet, decrypt balances for arbitrary ERC-7984 tokens, and claim Sepolia faucet tokens for the official test pairs.

## Live

- Live URL: https://cloak-room.vercel.app/

<img width="1275" height="507" alt="image" src="https://github.com/user-attachments/assets/b6c16166-b5ee-4201-b7a9-74530e3d81a1" />


- Supported chains: Ethereum mainnet and Sepolia

## Features


- Claim faucet tokens on Sepolia for the known public cTokenMock pairs <br/> <br/>  <img width="475" height="417" alt="image" src="https://github.com/user-attachments/assets/b9207eea-7280-48b7-a2c8-584d77390e47" />

- Browse the official onchain registry on the connected supported chain <br/> <br/> <img width="1313" height="385" alt="image" src="https://github.com/user-attachments/assets/944d2365-80be-4870-84dc-04a84314a817" />

- Wrap and unwrap registry pairs <br/>  <br/> <img width="315" height="332" alt="image" src="https://github.com/user-attachments/assets/9b944033-0594-4df0-b607-9a71d7f59931" /><img width="448" height="319" alt="image" src="https://github.com/user-attachments/assets/f16efe23-d952-4740-989b-6777de205dd4" />


- Decrypt balances for any ERC-7984 token address on the active supported chain <br/> <br/>
<img width="315" height="332" alt="image" src="https://github.com/user-attachments/assets/9fbdbb7c-5002-4d87-b34f-8295388043fa" /><img width="287" height="381" alt="image" src="https://github.com/user-attachments/assets/89613f46-53cc-4691-bd5f-f98cffcf6645" />

- Decrypt balances for any arbitrary ERC-7984 token address on the active supported chain <br/> <br/> <img width="468" height="414" alt="image" src="https://github.com/user-attachments/assets/52a075dd-d5ab-4bee-92ce-7ce27c03dc36" />


- Import custom pairs ( see [Adiing a new pair](##Adding-a-new-pair) for more details)


- Merge repo-defined dev pairs from `lib/pairs.local.json`

## Registry source

The app uses a hybrid model:

1. Official registry pairs are read from the Zama Wrappers Registry contract for the active chain.
2. Repo-defined pairs are read from `lib/pairs.local.json`.
3. Browser-imported pairs are stored in `localStorage` and merged last.

Official pairs always win. Imported pairs never override official or repo-configured entries.

Because official pairs are fetched from the onchain registry at runtime, newly registered official pairs can appear without a code change after the registry returns them and their metadata is readable.

## Architecture

- `app/page.tsx` renders the dashboard shell.
- `components/Dashboard.tsx` coordinates network-aware registry browsing, faucet visibility, local pair import, and utility panels.
- `components/PairList.tsx` and `components/PairCard.tsx` render official, repo-configured, and browser-imported pairs.
- `components/WrapUnwrapDialog.tsx` handles wrap/unwrap, balance display, max amount shortcuts, and mainnet gas warnings.
- `components/DecryptPanel.tsx` handles registry-pair balance reveal and arbitrary ERC-7984 token inspection/decryption.
- `components/FaucetButton.tsx` handles Sepolia ERC-20 test-token minting with per-token faucet policies.
- `lib/registry.ts` reads the SDK-backed onchain registry, merges local config, enriches imported pairs, and validates ERC-7984 support.
- `lib/zama.ts` wraps Zama SDK calls for shield, unshield, and user decryption.
- `app/api/relayer/[chainId]/[...path]/route.ts` proxies relayer requests through the app route.

## Adding a new pair

You have two paths:

### 1. Repo-configured pair

Add an entry to `lib/pairs.local.json`:

```json
{
  "tokenAddress": "0xYourErc20Address",
  "confidentialTokenAddress": "0xYourErc7984Address",
  "label": "My Dev Pair",
  "network": "sepolia"
}
```

Use this path for forks, team deployments, or dev-only pairs that should ship with the app configuration. If you are contributing to this repository, open a PR with the JSON change. The validation script checks that the confidential token exposes ERC-7984 and that the underlying token is not already an official pair.

### 2. In-app local import

On Sepolia, use the `+ Add Pair` button in the registry header. <img width="1284" height="470" alt="image" src="https://github.com/user-attachments/assets/e054dbd7-acb7-48ed-82ae-d982c51da823" />


Paste the underlying ERC-20 contract address and its matching ERC-7984 wrapper contract address, add an optional label, and save. <img width="639" height="530" alt="image" src="https://github.com/user-attachments/assets/1aa01dcc-3855-4450-b142-757cad9a0047" />


Imported pairs are saved only in that browser via `localStorage`, scoped to the selected chain, and do not modify the official Zama registry.

This path is intended for demo, private, or developer-only pairs. The app cannot infer a wrapper from a single contract address; the ERC-20 and ERC-7984 wrapper must already be deployed and linked.

## Local development

```bash
npm install
npm run dev
```

## Deployment

The app is deployed on Vercel at https://cloak-room.vercel.app/.

For a new deployment, connect the public GitHub repository to Vercel and set the environment variables below. Vercel can use the default Next.js build command:

```bash
npm run build
```

There is no custom deployment script required beyond the standard Vercel/Next.js deployment flow.

## Environment variables

Set these in `.env.local`:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_MAINNET_RPC_URL` | Optional mainnet RPC override |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | Optional Sepolia RPC override |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID for RainbowKit |
| `ZAMA_MAINNET_RELAYER_URL` | Optional mainnet relayer override for the local proxy |
| `ZAMA_SEPOLIA_RELAYER_URL` | Optional Sepolia relayer override for the local proxy |

The app falls back to public RPC endpoints if the optional RPC overrides are not set.

## Scripts

- `npm run dev` - start the app locally
- `npm run build` - production build
- `npm run validate-pairs` - CI validation for repo-defined custom pairs

## UX and error handling

- Unsupported networks show a blocking banner with one-click switch back to Sepolia. <br/> <img width="1220" height="58" alt="image" src="https://github.com/user-attachments/assets/9fe3a439-9640-4db2-817e-0c95d5270a92" />

- Faucet and `+ Add Pair` only render on Sepolia.
- Faucet claims use known safe per-token mint amounts and disable known restricted tokens.
- The faucet panel links users to a Sepolia ETH faucet when their connected wallet has no Sepolia ETH. <br/> <img width="432" height="129" alt="image" src="https://github.com/user-attachments/assets/9dc620ce-e4b4-4403-8441-ef099d85771a" />

- Mainnet state-changing flows show a gas-cost notice.
- Wrap pre-checks wallet balance before submitting.
- The wrap dialog surfaces actionable SDK/wallet errors instead of collapsing everything into a generic failure.
- Arbitrary token inspection distinguishes unsupported/plain ERC-20 addresses from readable ERC-7984 tokens.<br/> <img width="462" height="415" alt="image" src="https://github.com/user-attachments/assets/ae2df46d-a76f-4cc5-870b-fad02a4c021d" />

- User decryption uses the connected wallet's EIP-712 signature flow.

## Notes

- Faucet actions only render on Sepolia.
- Mainnet shows a gas-cost warning before wrap and unwrap actions.
- Decryption uses the EIP-712 user-decryption flow through the Zama SDK.
