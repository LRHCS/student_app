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
    webpack: (config, { dev, isServer }) => {
      // Enable tree shaking
      config.optimization = {
        ...config.optimization,
        usedExports: true,
      }
      
      // Add production-only optimizations
      if (!dev && !isServer) {
        config.optimization.splitChunks = {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            default: false,
            vendors: false,
            commons: {
              name: 'commons',
              chunks: 'all',
              minChunks: 2,
            },
            lib: {
              test: /[\\/]node_modules[\\/]/,
              name(module) {
                const context = module.context;
                let packageName = 'unknown';
                if (context) {
                  const matches = context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/);
                  if (matches && matches[1]) {
                    packageName = matches[1];
                  }
                }
                return `npm.${packageName.replace('@', '')}`;
              },
              chunks: 'all',
            },
          },
        }
      }
      
      // Only run in development and client-side
      if (dev && !isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'server',
            analyzerPort: 8888,
            openAnalyzer: false,
          })
        );
      }
      
      // Optimize source maps
      if (!dev && !isServer) {
        config.devtool = 'source-map'
      }
      
      return config
    },
    compress: true,
    productionBrowserSourceMaps: false,
  }
  
  export default nextConfig;
  