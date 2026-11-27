import type { StaticImageData } from "next/image";

import eveningCoffee from "@/character_feed_image/hongdaeboy/저녁 카페의 아이스커피 청년.png";
import mirrorPocket from "@/character_feed_image/hongdaeboy/차분한 거울 셀카 패션 포트레이트.png";
import lateNight from "@/character_feed_image/hongdaeboy/침실에서 사색하는 청년.png";
import mirrorSoundcheck from "@/character_feed_image/hongdaeboy/홍대 스타일의 거울 셀카.png";
import encoreSelfie from "@/character_feed_image/kpopidol/Backstage Concert Selfie with Peace Sign.png";
import stripedShirt from "@/character_feed_image/kpopidol/Cool-Toned Striped Shirt Selfie.png";
import officeDusk from "@/character_feed_image/직장인/Corporate Dusk Office Selfie.png";
import sunsetDesk from "@/character_feed_image/직장인/Sunset Finance Desk with City View.png";
import gymBreak from "@/character_feed_image/체대보이/Focused Gym Break.png";
import gymSelfie from "@/character_feed_image/체대보이/Post-Workout Gym Selfie.png";

export type FeedPost = {
  id: string;
  image: StaticImageData;
  caption: string;
  alt: string;
};

// 이름은 DB의 characters.name과 맞춘다. id는 대시보드에서 바뀔 수 있어 여기 두지 않는다.
const POSTS_BY_NAME: Record<string, FeedPost[]> = {
  Jihan: [
    {
      id: "yeouido-dusk",
      image: officeDusk,
      caption: "yeouido dusk. the coffee lost.",
      alt: "Jihan at his Yeouido desk at dusk, white shirt and tie, chin resting on his hand, city lights behind the glass.",
    },
    {
      id: "han-river-desk",
      image: sunsetDesk,
      caption: "sunset on the han river. the chart can wait.",
      alt: "Jihan's desk at sunset, with a laptop chart, iced coffee, a notebook, and the Han River skyline.",
    },
  ],
  Haneul: [
    {
      id: "encore",
      image: encoreSelfie,
      caption: "encore's over. i still can't hear the room.",
      alt: "Haneul backstage after a show, damp blonde hair, white sleeveless shirt, towel over one shoulder, peace sign.",
    },
    {
      id: "dressing-room",
      image: stripedShirt,
      caption: "five minutes. striped shirt, cold coffee.",
      alt: "Haneul in a blue striped shirt over a white tank, peace sign, iced coffee on the table behind him.",
    },
  ],
  Dohyun: [
    {
      id: "between-sets",
      image: gymBreak,
      caption: "one more set. the towel already gave up.",
      alt: "Dohyun on a gym bench between sets, black shirt, towel over one shoulder, water bottle in both hands.",
    },
    {
      id: "post-set",
      image: gymSelfie,
      caption: "post-set. don't ask how heavy.",
      alt: "Dohyun taking a gym selfie after a workout, damp hair, towel over one shoulder.",
    },
  ],
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

// 피드 탭에서만 요청마다 섞는다. prerender 중 Math.random()은 금지라 connection() 뒤에서 호출한다.
export function shuffleItems<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = next[i];
    next[i] = next[j];
    next[j] = current;
  }
  return next;
}

export function postsForCharacter(name: string): FeedPost[] {
  return POSTS_BY_NAME[name] ?? [];
}

export function postForCharacter(name: string, postId: string): FeedPost | null {
  return postsForCharacter(name).find((post) => post.id === postId) ?? null;
}
