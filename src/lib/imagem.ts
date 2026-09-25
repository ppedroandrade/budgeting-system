"use client";

import { supabaseNavegador } from "@/lib/supabase/client";

export const BUCKET = "arquivos";

/**
 * Reduz a foto para no máximo `max` px no lado maior e converte para JPEG
 * (o gerador de PDF não aceita WebP/HEIC). PNG é mantido só para a logo,
 * por causa da transparência.
 */
export async function redimensionar(arquivo: File, max = 1200, tipo: "image/jpeg" | "image/png" = "image/jpeg"): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) throw new Error("Não foi possível ler esta imagem. Tente uma foto JPG ou PNG.");

  const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * escala));
  const h = Math.max(1, Math.round(bitmap.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  if (tipo === "image/jpeg") {
    ctx.fillStyle = "#ffffff"; // fundo branco no lugar da transparência
    ctx.fillRect(0, 0, w, h);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise((ok, erro) =>
    canvas.toBlob((b) => (b ? ok(b) : erro(new Error("Falha ao converter a imagem."))), tipo, 0.85),
  );
}

/** Envia a imagem e devolve a URL pública. Nunca sobrescreve: cada envio ganha um nome novo. */
export async function enviarImagem(pasta: "produtos" | "empresa", blob: Blob): Promise<string> {
  const ext = blob.type === "image/png" ? "png" : "jpg";
  const caminho = `${pasta}/${crypto.randomUUID()}.${ext}`;
  const supabase = supabaseNavegador();
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error("Não foi possível enviar a foto. Verifique a conexão e tente de novo.");
  return supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
}
