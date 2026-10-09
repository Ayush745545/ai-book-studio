/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep localhost and 127.0.0.1 callbacks on the browser's original host.
  skipMiddlewareUrlNormalize: true,
  experimental: {
    // Keep native/dynamic-require packages out of the server bundle
    serverComponentsExternalPackages: ["pdfkit", "bcryptjs", "@prisma/client"],
  },
  images: {
    remotePatterns: [
      // DALL-E generated cover URLs
      { protocol: "https", hostname: "oaidalleapiprodscus.blob.core.windows.net" },
      { protocol: "https", hostname: "openaidevprodscus.blob.core.windows.net" },
      { protocol: "https", hostname: "images.openai.com" },
    ],
  },
};

module.exports = nextConfig;
