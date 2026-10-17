import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, processImage } from "@/lib/image-processor";

describe("Image processor", () => {
  it("resizes large images down to max 1200x1200 and converts to WebP", async () => {
    // 2000x1000 PNG image
    const largePng = await sharp({
      create: {
        width: 2000,
        height: 1000,
        channels: 3,
        background: { r: 218, g: 165, b: 32 }, // gold
      },
    })
      .png()
      .toBuffer();

    const processed = await processImage(largePng);
    const meta = await sharp(processed).metadata();

    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(600);
    expect(meta.exif).toBeUndefined();
  });

  it("does not enlarge images smaller than 1200x1200", async () => {
    const smallJpeg = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 40, g: 167, b: 69 },
      },
    })
      .jpeg()
      .toBuffer();

    const processed = await processImage(smallJpeg);
    const meta = await sharp(processed).metadata();

    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
  });

  it("rejects non-image files by magic bytes", async () => {
    const fakeBuffer = Buffer.from("<html><body>Malicious script</body></html>");

    await expect(processImage(fakeBuffer)).rejects.toThrow(
      "Tipo de ficheiro inválido. Apenas JPEG, PNG, WebP, GIF e AVIF são permitidos.",
    );
  });

  it("rejects buffers larger than MAX_UPLOAD_BYTES", async () => {
    const oversizedBuffer = Buffer.alloc(MAX_UPLOAD_BYTES + 10);

    await expect(processImage(oversizedBuffer)).rejects.toThrow(
      "A imagem excede o tamanho máximo permitido",
    );
  });
});
