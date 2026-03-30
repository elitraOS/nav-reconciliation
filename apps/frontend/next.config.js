/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@nav-reconciliation/shared'],
};

module.exports = nextConfig;
