/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer', 'bwip-js'],
  },
};

export default nextConfig;
