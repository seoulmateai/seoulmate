import type { StaticImageData } from "next/image";

import eveningCoffee from "@/character_feed_image/저녁 카페의 아이스커피 청년.png";
import mirrorPocket from "@/character_feed_image/차분한 거울 셀카 패션 포트레이트.png";
import lateNight from "@/character_feed_image/침실에서 사색하는 청년.png";
import mirrorSoundcheck from "@/character_feed_image/홍대 스타일의 거울 셀카.png";

export type FeedPost = {
  id: string;
  image: StaticImageData;
  caption: string;
  alt: string;
};

// 이름은 DB의 characters.name과 맞춘다. id는 대시보드에서 바뀔 수 있어 여기 두지 않는다.
const POSTS_BY_NAME: Record<string, FeedPost[]> = {
  Doyoon: [
    {
      id: "evening-coffee",
      image: eveningCoffee,
      caption: "late coffee. the ice is already half gone.",
      alt: "Doyoon at an evening cafe table with an iced coffee, in a black knit and a cross-body strap.",
    },
    {
      id: "mirror-soundcheck",
      image: mirrorSoundcheck,
      caption: "hongdae, before soundcheck.",
      alt: "Doyoon taking a mirror selfie in a navy track jacket, wired earphones in.",
    },
    {
      id: "mirror-pocket",
      image: mirrorPocket,
      caption: "same jacket. different pocket.",
      alt: "Doyoon in the same navy jacket, one hand in his pocket, earphones in.",
    },
    {
      id: "late-night",
      image: lateNight,
      caption: "couldn't sleep. the wall photos are winning.",
      alt: "Doyoon on a bed with his chin on his hand, earphones in, small photos on the wall.",
    },
  ],
};

export function postsForCharacter(name: string): FeedPost[] {
  return POSTS_BY_NAME[name] ?? [];
}

export function postForCharacter(name: string, postId: string): FeedPost | null {
  return postsForCharacter(name).find((post) => post.id === postId) ?? null;
}
