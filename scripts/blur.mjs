// 캐릭터 이미지의 blur placeholder 생성 → 출력값을 characters.blur_data_url 칼럼에 붙여넣기
// 사용법: node scripts/blur.mjs <이미지 파일>
import sharp from "sharp";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/blur.mjs <image file>");
  process.exit(1);
}

const buf = await sharp(file)
  .resize(8, 10, { fit: "cover", position: "top" }) // 카드 비율(4:5)·object-top과 맞춤
  .webp({ quality: 50 })
  .toBuffer();
console.log(`data:image/webp;base64,${buf.toString("base64")}`);
