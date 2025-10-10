/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Ensure Prisma is not bundled into server components; load at runtime instead
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};
export default nextConfig;
