import "server-only";

import sharp from "sharp";

import { IMAGE_MAX_DIMENSION } from "./constants";

export type NormalizedImage = { data: Buffer; width: number; height: number };

/**
 * 받은 이미지를 WebP로 다시 인코딩한다.
 * 브라우저에서 이미 변환해서 오지만, 클라이언트를 믿지 않고 여기서 포맷·크기를 보장하고
 * EXIF(위치정보 등)를 제거한다. 이미지가 아니면 null.
 */
export async function normalizeImage(input: ArrayBuffer): Promise<NormalizedImage | null> {
  try {
    const { data, info } = await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate() // EXIF 방향 반영 (메타데이터는 출력에 포함되지 않음)
      .resize({
        width: IMAGE_MAX_DIMENSION,
        height: IMAGE_MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    return null;
  }
}
