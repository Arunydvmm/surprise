/** @type {import('next').NextConfig} */
const nextConfig = {
  // mysql2 must stay a real Node dependency (not bundled) on the server.
  experimental: { serverComponentsExternalPackages: ["mysql2"] },
  poweredByHeader: false,
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
      ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : [])
    ];
    return [{ source: "/:path*", headers: securityHeaders }];
  }
};
export default nextConfig;
