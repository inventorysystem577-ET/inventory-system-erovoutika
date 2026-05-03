/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for better development
  reactStrictMode: true,
  
  // Disable eslint during build (since we have custom eslint config)
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable typescript errors during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Image optimization settings
  images: {
    unoptimized: true,
  },
  
  // Output standalone for better deployment
  output: 'standalone',
};

export default nextConfig;
