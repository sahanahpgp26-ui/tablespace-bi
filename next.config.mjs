/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable instrumentation.ts (auto-seed on startup)
  experimental: {
    instrumentationHook: true,
  },
  // Silence the node:sqlite experimental warning in prod logs
  serverExternalPackages: [],
};
export default nextConfig;
