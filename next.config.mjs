/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '**', // Allow all domains - be careful with this in production
        },
      ],
      formats: ['image/avif', 'image/webp'],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      minimumCacheTTL: 60,
    },
    experimental: {
      optimizeCss: true,
      optimizePackageImports: ['@heroicons/react', 'date-fns', 'lodash', "react-icons"],
    },
    compress: true,
    productionBrowserSourceMaps: false,
  }
  
  export default nextConfig;
  