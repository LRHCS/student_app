/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Allow all domains - be careful with this in production
      },
    ],
  },
}

module.exports = nextConfig
