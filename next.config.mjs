/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdf-parse tries to load test files via canvas; alias it away
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig;
