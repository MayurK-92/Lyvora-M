import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @lyvora/ui and @lyvora/core ship untranspiled TS source (no build step of their own).
  transpilePackages: ["@lyvora/ui", "@lyvora/core"],
  // Native canvas + PDF.js worker used by PDF OCR fallback in process-capture.
  serverExternalPackages: ["@napi-rs/canvas", "pdfjs-dist", "unpdf"],
};

export default nextConfig;
