/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true
  },
  // Vercel環境での設定
  async rewrites() {
    return [
      {
        source: '/socket.io',
        destination: '/api/socket.io',
      },
      {
        source: '/socket.io/:path*',
        destination: '/api/socket.io/:path*',
      },
    ];
  },
  // サーバーリクエストのタイムアウト延長
  experimental: {
    serverComponentsExternalPackages: ['socket.io', 'socket.io-client'],
  },
};

module.exports = nextConfig;