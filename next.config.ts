import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Formularios con foto o comprobante. Las imágenes se reducen en el navegador
      // (src/lib/image.ts); este límite cubre PDF y navegadores que no pueden reducirlas.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
