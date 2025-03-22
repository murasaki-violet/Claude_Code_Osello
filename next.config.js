/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true
  },
  // サーバーリクエストのタイムアウト延長
  experimental: {
    serverComponentsExternalPackages: ['socket.io', 'socket.io-client'],
  },
};

module.exports = nextConfig;