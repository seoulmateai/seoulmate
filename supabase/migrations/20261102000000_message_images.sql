-- =====================================================================
-- Seoulmate — 채팅 이미지 (사용자 → 캐릭터)
--
--  - messages.image_*: 비공개 R2 버킷(R2_CHAT_IMAGES_BUCKET)의 WebP 오브젝트
--    키: {user_id}/{uuid}.webp. 화면에는 /api/chat/images/{message_id} 로 표시
--  - 사진만 보내면 content = '' (텍스트와 사진 중 하나는 있어야 함)
-- =====================================================================

ALTER TABLE public.messages
    ADD COLUMN image_path   TEXT,
    ADD COLUMN image_width  INT CHECK (image_width > 0),
    ADD COLUMN image_height INT CHECK (image_height > 0),
    ADD CONSTRAINT messages_content_or_image
        CHECK (content <> '' OR image_path IS NOT NULL),
    ADD CONSTRAINT messages_image_dims
        CHECK ((image_path IS NULL) = (image_width IS NULL)
           AND (image_path IS NULL) = (image_height IS NULL));


-- 사진만 보낸 메시지는 채팅 목록 미리보기를 'Photo'로
CREATE OR REPLACE FUNCTION public.touch_chat_room()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    UPDATE public.chat_rooms
       SET last_message_at      = NEW.created_at,
           last_message_preview = left(
               CASE WHEN NEW.content = '' AND NEW.image_path IS NOT NULL THEN 'Photo'
                    ELSE NEW.content END,
               100)
     WHERE id = NEW.room_id;
    RETURN NEW;
END;
$$;
