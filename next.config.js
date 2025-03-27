/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true
  },
  // サーバーリクエストのタイムアウト延長
  experimental: {
    serverExternalPackages: ['socket.io', 'socket.io-client'],
  },
};

module.exports = nextConfig;