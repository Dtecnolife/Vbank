import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Additional config options
  poweredByHeader: false,
};

export default nextConfig;
