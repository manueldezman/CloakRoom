/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The Zama SDK's WASM crypto module needs these headers to run in the browser.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
