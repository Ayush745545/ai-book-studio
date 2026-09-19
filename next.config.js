/** @type {import('next').NextConfig} */
const nextConfig = {
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
