"use client";

import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setThemePreference: (value: ThemePreference) => void;
  toggleTheme: () => void;
};

const STORAGE_KEY = "zama-registry-theme";
const ThemePreferenceContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useThemePreferenceState(): ThemeContextValue {
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [hydrated, setHydrated] = useState(false);
  const resolvedTheme = useMemo<ResolvedTheme>(
    () => (themePreference === "system" ? getSystemTheme() : themePreference),
    [themePreference]
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemePreference(stored);
      }
    } catch {
      // Ignore storage failures and fall back to the system theme.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    try {
      window.localStorage.setItem(STORAGE_KEY, themePreference);
    } catch {
      // Ignore storage failures; the theme still applies for this session.
    }
  }, [hydrated, resolvedTheme, themePreference]);

  useEffect(() => {
    if (themePreference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      document.documentElement.dataset.theme = media.matches ? "dark" : "light";
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [themePreference]);

  return {
    themePreference,
    resolvedTheme,
    setThemePreference,
    toggleTheme: () =>
      setThemePreference((current) => {
        const next = (current === "system" ? getSystemTheme() : current) === "dark" ? "light" : "dark";
        return next;
      }),
  };
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const value = useThemePreferenceState();
  return createElement(ThemePreferenceContext.Provider, { value, children });
}

export function useThemePreference() {
  const value = useContext(ThemePreferenceContext);
  if (!value) {
    throw new Error("useThemePreference must be used within a ThemePreferenceProvider");
  }
  return value;
}
