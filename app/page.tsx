import { Header } from "@/components/Header";
import { NetworkBanner } from "@/components/NetworkBanner";
import { PairList } from "@/components/PairList";
import { ArbitraryDecryptPanel } from "@/components/DecryptPanel";

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto px-sm py-md">
      <Header />
      <NetworkBanner />

      <section className="py-md">
        <h1 className="font-display text-headline-lg">One registry. Every wrapper.</h1>
        <p className="text-body-lg text-tertiary mt-2 max-w-xl">
          Every official ERC-20 ↔ ERC-7984 pair on Sepolia, read straight from the onchain
          Confidential Token Wrappers Registry. Wrap, unwrap, and decrypt — no guessing which
          address is the real one.
        </p>
      </section>

      <section className="py-sm">
        <h2 className="font-display text-headline-sm mb-sm">Registry pairs</h2>
        <PairList />
      </section>

      <section className="py-md">
        <ArbitraryDecryptPanel />
      </section>

      <footer className="py-md text-body-sm text-tertiary">
        Made with love by{" "}
        <a
          className="underline underline-offset-2 hover:opacity-70"
          href="https://x.com/0xdezman"
          target="_blank"
          rel="noreferrer"
        >
          0xDezman
        </a>{" "}
        for Zama
      </footer>
    </main>
  );
}
