"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { injectedWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

const config = getDefaultConfig({
  appName: "Confidential Wrapper Registry",
  projectId,
  chains: [sepolia],
  ssr: true,
  wallets: [
    {
      groupName: "Recommended",
      wallets: [injectedWallet, walletConnectWallet],
    },
  ],
});

const queryClient = new QueryClient();

// RainbowKit theme mapped onto the Zama Light tokens — yellow accent,
// black text, small 4px radii, no shadows.
const zamaRainbowTheme = lightTheme({
  accentColor: "#ffd208",
  accentColorForeground: "#000000",
  borderRadius: "small",
  overlayBlur: "small",
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={zamaRainbowTheme}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
