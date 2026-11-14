// messages.content 형식 (서버·클라이언트 공용, 외부 import 없음 → node --test로 바로 테스트)
//
//   *그는 창밖을 보다가 천천히 고개를 돌렸다.*
//
//   왔어?
//
// - 단락은 빈 줄로 구분. 줄 전체가 *...* 이면 상황 묘사(줄글), 아니면 대사(말풍선)
// - AI 답장은 서버가 serializeParts()로 이 형식에 맞춰 저장한다 (묘사 1단락 = 1줄)
// - 사용자 입력은 그대로 저장하고 화면에서만 parseMessageContent()로 나눈다
// - 별표가 없는 기존 메시지는 대사 1개

export type ContentKind = "NARRATION" | "DIALOGUE";
export type ContentPart = { kind: ContentKind; text: string };

const NARRATION_LINE = /^\*([^*]+)\*$/;

export function parseMessageContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let current: ContentPart | null = null;

  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      current = null; // 빈 줄 = 단락 끝
      continue;
    }
    const narration = NARRATION_LINE.exec(line);
    const kind: ContentKind = narration ? "NARRATION" : "DIALOGUE";
    const text = narration ? narration[1].trim() : line;

    // 빈 줄 없이 이어진 같은 종류의 줄은 한 단락 (대사 말풍선 안의 줄바꿈 등)
    if (current && current.kind === kind) {
      current.text += kind === "NARRATION" ? ` ${text}` : `\n${text}`;
    } else {
      current = { kind, text };
      parts.push(current);
    }
  }
  return parts;
}

/** AI 답장 parts → 저장 형식. 별표는 지우고, 묘사는 한 줄로, 대사 안의 빈 줄은 한 줄바꿈으로 */
export function serializeParts(parts: ContentPart[]): string {
  return parts
    .map(({ kind, text }) => {
      const clean = text.replace(/\*/g, "").trim();
      if (!clean) return "";
      return kind === "NARRATION"
        ? `*${clean.replace(/\s*\n\s*/g, " ")}*`
        : clean.replace(/\n\s*\n+/g, "\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

/** 대사 말풍선 안의 *강조* 구간 (예: "*웃으며* 안녕") → 화면에서 기울임 처리용 */
export function splitInlineEmphasis(text: string): { text: string; emphasis: boolean }[] {
  return text
    .split(/(\*[^*\n]+\*)/)
    .filter(Boolean)
    .map((s) =>
      /^\*[^*\n]+\*$/.test(s) ? { text: s.slice(1, -1), emphasis: true } : { text: s, emphasis: false },
    );
}
