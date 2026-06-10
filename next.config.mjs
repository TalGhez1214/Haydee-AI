/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // These packages use Node.js internals or have broken requires that webpack can't bundle
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist', 'mammoth'],
  },
  webpack: (config) => {
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig;
