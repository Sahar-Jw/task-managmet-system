/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained Node server (.next/standalone) for the Docker image.
  output: 'standalone',
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: {
    // The PDF worker route reads this file at runtime; standalone tracing
    // can't see it because the path is built dynamically.
    outputFileTracingIncludes: {
      '/pdf.worker.min.mjs': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs'],
    },
  },
};

export default nextConfig;
