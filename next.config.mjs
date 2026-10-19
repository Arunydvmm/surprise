/** @type {import('next').NextConfig} */
const nextConfig = {
  // mysql2 must stay a real Node dependency (not bundled) on the server.
  experimental: { serverComponentsExternalPackages: ["mysql2"] },
  poweredByHeader: false
};
export default nextConfig;
