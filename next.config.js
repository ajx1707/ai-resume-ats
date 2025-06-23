/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  basePath: '/ai-resume-ats',
  assetPrefix: '/ai-resume-ats/',
  trailingSlash: true,
};

module.exports = nextConfig;
