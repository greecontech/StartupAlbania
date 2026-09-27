/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "bcryptjs"],
  poweredByHeader: false,
  experimental: {
    // CSV imports go through a server action (max 5 MB file).
    serverActions: { bodySizeLimit: "6mb" }
  }
};

export default nextConfig;
