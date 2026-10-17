import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock das dependências externas
vi.mock("@vercel/blob", () => ({
  put: vi.fn().mockResolvedValue({ url: "https://blob.vercel-storage.com/menu/item-1-123.webp" }),
  del: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/admin-auth", () => ({
  isAdminAuthenticated: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    menuItem: {
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { DELETE, POST } from "../../app/api/upload/route";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

describe("Upload Route API (/api/upload)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, BLOB_READ_WRITE_TOKEN: "mock_token" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("POST /api/upload", () => {
    it("returns 401 when the administrator is not authenticated", async () => {
      vi.mocked(isAdminAuthenticated).mockResolvedValue(false);

      const request = new Request("http://localhost/api/upload", {
        method: "POST",
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Não autorizado.");
    });

    it("returns 503 when BLOB_READ_WRITE_TOKEN is not configured", async () => {
      vi.mocked(isAdminAuthenticated).mockResolvedValue(true);
      delete process.env["BLOB_READ_WRITE_TOKEN"];

      const request = new Request("http://localhost/api/upload", {
        method: "POST",
      });

      const response = await POST(request);
      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toContain("BLOB_READ_WRITE_TOKEN não está configurado");
    });

    it("returns 400 when form data is missing a valid file", async () => {
      vi.mocked(isAdminAuthenticated).mockResolvedValue(true);

      const formData = new FormData();
      formData.append("itemId", "some-uuid");

      const request = {
        formData: async () => formData,
      } as unknown as Request;

      const response = await POST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Nenhum ficheiro recebido.");
    });

    it("returns 404 when item is not found in database", async () => {
      vi.mocked(isAdminAuthenticated).mockResolvedValue(true);
      vi.mocked(prisma.menuItem.findUnique).mockResolvedValue(null);

      const fakePngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const formData = new FormData();
      formData.append("itemId", "non-existent-id");
      formData.append("file", new File([fakePngBuffer], "test.png", { type: "image/png" }));

      const request = {
        formData: async () => formData,
      } as unknown as Request;

      const response = await POST(request);
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Produto não encontrado.");
    });

    it("successfully uploads and persists blob url in Prisma", async () => {
      vi.mocked(isAdminAuthenticated).mockResolvedValue(true);
      vi.mocked(prisma.menuItem.findUnique).mockResolvedValue({ id: "item-123" } as never);
      vi.mocked(prisma.menuItem.update).mockResolvedValue({ id: "item-123" } as never);

      // Create a real minimal valid PNG for sharp
      const sharp = (await import("sharp")).default;
      const validPng = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 3,
          background: { r: 100, g: 150, b: 200 },
        },
      })
        .png()
        .toBuffer();

      const formData = new FormData();
      formData.append("itemId", "item-123");
      formData.append("file", new File([validPng], "plate.png", { type: "image/png" }));

      const request = {
        formData: async () => formData,
      } as unknown as Request;

      const response = await POST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.url).toBe("https://blob.vercel-storage.com/menu/item-1-123.webp");
      expect(prisma.menuItem.update).toHaveBeenCalledWith({
        where: { id: "item-123" },
        data: { imageUrl: "https://blob.vercel-storage.com/menu/item-1-123.webp" },
      });
    });
  });

  describe("DELETE /api/upload", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(isAdminAuthenticated).mockResolvedValue(false);

      const request = new Request("http://localhost/api/upload", {
        method: "DELETE",
        body: JSON.stringify({ itemId: "item-1" }),
      });

      const response = await DELETE(request);
      expect(response.status).toBe(401);
    });

    it("successfully clears imageUrl and returns 200", async () => {
      vi.mocked(isAdminAuthenticated).mockResolvedValue(true);
      vi.mocked(prisma.menuItem.findUnique).mockResolvedValue({
        id: "item-1",
        imageUrl: "https://blob.vercel-storage.com/menu/item-1.webp",
      } as never);
      vi.mocked(prisma.menuItem.update).mockResolvedValue({} as never);
      vi.mocked(prisma.menuItem.count).mockResolvedValue(0);

      const request = new Request("http://localhost/api/upload", {
        method: "DELETE",
        body: JSON.stringify({
          itemId: "item-1",
          url: "https://blob.vercel-storage.com/menu/item-1.webp",
        }),
      });

      const response = await DELETE(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(prisma.menuItem.update).toHaveBeenCalledWith({
        where: { id: "item-1" },
        data: { imageUrl: null },
      });
    });
  });
});
