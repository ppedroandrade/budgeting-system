import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gerador de PDF roda no servidor como pacote externo.
  serverExternalPackages: ["@react-pdf/renderer", "exceljs"],
  // Fontes e logos lidas do disco pelo gerador de PDF precisam ir junto na publicação.
  outputFileTracingIncludes: {
    "/orcamentos/[id]/pdf": ["./src/pdf/fontes/**", "./src/pdf/*.png"],
  },
};

export default nextConfig;
