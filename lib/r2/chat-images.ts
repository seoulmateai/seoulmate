import "server-only";

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 채팅 이미지 전용 비공개 버킷 (캐릭터 이미지 공개 버킷과 분리)
// 키: {userId}/{uuid}.webp

/** 조회용 presigned URL 유효 시간 */
export const IMAGE_URL_TTL_SECONDS = 60 * 60;

let client: S3Client | null = null;
function getClient() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY is not set");
  }
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // R2는 SDK 기본 체크섬 헤더를 일부 지원하지 않음
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

function bucket() {
  const name = process.env.R2_CHAT_IMAGES_BUCKET;
  if (!name) throw new Error("R2_CHAT_IMAGES_BUCKET is not set");
  return name;
}

export async function putChatImage(userId: string, webp: Buffer) {
  const key = `${userId}/${crypto.randomUUID()}.webp`;
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: webp,
      ContentType: "image/webp",
      CacheControl: "private, max-age=31536000, immutable",
    }),
  );
  return key;
}

export async function deleteChatImage(key: string) {
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

export function signChatImageUrl(key: string) {
  return getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: IMAGE_URL_TTL_SECONDS,
  });
}

/** 회원 탈퇴 시 사용자의 이미지 전부 삭제 */
export async function deleteUserChatImages(userId: string) {
  const s3 = getClient();
  let token: string | undefined;
  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        Prefix: `${userId}/`,
        ContinuationToken: token,
      }),
    );
    const objects = (page.Contents ?? []).flatMap((o) => (o.Key ? [{ Key: o.Key }] : []));
    if (objects.length > 0) {
      await s3.send(new DeleteObjectsCommand({ Bucket: bucket(), Delete: { Objects: objects } }));
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
}
