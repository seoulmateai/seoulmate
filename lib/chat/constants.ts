/** 채팅방에서 한 번에 불러오는 메시지(말풍선) 수 */
export const MESSAGE_PAGE_SIZE = 30;
/** 사용자 입력 최대 길이 (DB는 4000) */
export const MAX_INPUT_LENGTH = 1000;
/** 채팅 이미지 긴 변 최대 픽셀 (브라우저·서버 리사이즈 공통) */
export const IMAGE_MAX_DIMENSION = 1600;
/** 서버가 받는 이미지 최대 크기. 브라우저에서 줄여서 보내므로 보통 수백 KB */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
