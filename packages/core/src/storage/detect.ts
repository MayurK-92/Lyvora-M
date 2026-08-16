export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type DetectedUploadKind = "pdf" | "image";

export interface DetectedFile {
  kind: DetectedUploadKind;
  mime: string;
  extension: string;
}

/** Magic-byte sniff for PDF and common images (ignore client-supplied MIME). */
export function detectUploadFile(bytes: Uint8Array): DetectedFile | null {
  if (bytes.length < 12) return null;

  // %PDF-
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return { kind: "pdf", mime: "application/pdf", extension: "pdf" };
  }

  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { kind: "image", mime: "image/jpeg", extension: "jpg" };
  }

  // PNG
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { kind: "image", mime: "image/png", extension: "png" };
  }

  // GIF
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return { kind: "image", mime: "image/gif", extension: "gif" };
  }

  // WEBP (RIFF....WEBP)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { kind: "image", mime: "image/webp", extension: "webp" };
  }

  return null;
}
