import sharp from "sharp";

/** Tipos de imagem permitidos (validados por magic bytes no servidor). */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

/** Tamanho máximo do ficheiro original aceite: 10 MB. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Dimensão máxima (largura e altura) após redimensionamento. */
const MAX_DIMENSION = 1200;

/** Qualidade WebP de saída. */
const WEBP_QUALITY = 80;

/** Magic bytes para validação real do tipo de ficheiro. */
const MAGIC_SIGNATURES: { bytes: number[]; mime: string }[] = [
  { bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: "image/png" },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: "image/webp" }, // RIFF…WEBP
  { bytes: [0x47, 0x49, 0x46], mime: "image/gif" },
  // AVIF / HEIF têm caixa ftyp em offset 4; simplificamos checando AVIF
];

/**
 * Detecta o MIME type real do buffer pelos magic bytes.
 * Retorna null se não for reconhecido.
 */
function detectMimeType(buffer: Buffer): string | null {
  for (const sig of MAGIC_SIGNATURES) {
    const match = sig.bytes.every((byte, i) => buffer[i] === byte);
    if (match) {
      // WebP precisa de confirmação extra: bytes 8-11 == "WEBP"
      if (sig.mime === "image/webp") {
        if (buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
        continue; // era RIFF mas não WebP
      }
      return sig.mime;
    }
  }
  // AVIF: ftyp box em offset 4
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

/**
 * Valida, redimensiona para 1200×1200 máx, converte para WebP e devolve o Buffer.
 * Lança Error com mensagem localizada em caso de falha de validação.
 */
export async function processImage(inputBuffer: Buffer): Promise<Buffer> {
  // 1. Validar tamanho
  if (inputBuffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(
      `A imagem excede o tamanho máximo permitido (${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).`,
    );
  }

  // 2. Validar tipo real pelos magic bytes
  const detectedMime = detectMimeType(inputBuffer);
  if (!detectedMime || !(ALLOWED_MIME_TYPES as readonly string[]).includes(detectedMime)) {
    throw new Error(
      "Tipo de ficheiro inválido. Apenas JPEG, PNG, WebP, GIF e AVIF são permitidos.",
    );
  }

  // 3. Processar com sharp: auto-rotação EXIF, redimensionar, converter para WebP
  const sharpInstance = sharp(inputBuffer, { failOn: "error" })
    .rotate() // corrige orientação EXIF de câmaras/telemóveis
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",       // mantém proporção, nunca amplia
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 }); // sem withMetadata(), o sharp remove todos os metadados (EXIF, GPS, câmaras, etc.)

  const outputBuffer = await sharpInstance.toBuffer();
  return outputBuffer;
}
