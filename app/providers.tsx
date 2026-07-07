"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider, lightTheme, darkTheme } from "@rainbow-me/rainbowkit";
import { injectedWallet, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { ThemePreferenceProvider, useThemePreference } from "@/lib/useTheme";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

const config = getDefaultConfig({
  appName: "Confidential Wrapper Registry",
  projectId,
  chains: [mainnet, sepolia],
  ssr: true,
  wallets: [
    {
      groupName: "Recommended",
      wallets: [injectedWallet, walletConnectWallet],
    },
  ],
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemePreferenceProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowThemeProviders>{children}</RainbowThemeProviders>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemePreferenceProvider>
  );
}

function RainbowThemeProviders({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useThemePreference();
  const rkTheme = useMemo(
    () =>
      resolvedTheme === "dark"
        ? darkTheme({
            accentColor: "#ffd208",
            accentColorForeground: "#000000",
            borderRadius: "small",
            overlayBlur: "small",
          })
        : lightTheme({
            accentColor: "#ffd208",
            accentColorForeground: "#000000",
            borderRadius: "small",
            overlayBlur: "small",
          }),
    [resolvedTheme]
  );

  return <RainbowKitProvider theme={rkTheme}>{children}</RainbowKitProvider>;
}
