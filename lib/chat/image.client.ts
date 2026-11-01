import { IMAGE_MAX_DIMENSION } from "./constants";

export type PreparedImage = {
  blob: Blob;
  /** URL.createObjectURL — 다 쓰면 URL.revokeObjectURL */
  previewUrl: string;
  width: number;
  height: number;
};

/**
 * 고른 사진을 긴 변 IMAGE_MAX_DIMENSION 이하 WebP로 줄인다 (원본 수 MB → 보통 수백 KB).
 * WebP 인코딩을 못 하는 브라우저(구형 Safari)는 JPEG. 최종 WebP 변환은 서버가 한다.
 * 브라우저가 못 여는 포맷이면 throw.
 */
export async function prepareImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  // 투명 PNG가 JPEG로 갈 때 검게 나오지 않게
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await toBlob(canvas, "image/webp");
  if (blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg");
  return { blob, previewUrl: URL.createObjectURL(blob), width, height };
}

function toBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type, 0.85),
  );
}

/** 말풍선에 표시할 크기 (최대 240×320, 비율 유지) */
export function bubbleImageSize(width: number, height: number) {
  const scale = Math.min(240 / width, 320 / height, 1);
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
