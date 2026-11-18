"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { stageLabel } from "@/lib/affection/stages";

// 새 관계 단계 도달 → 에피소드 해금 안내. Close를 누르면 게이지 옆 버튼으로 나중에 시작
export function EpisodeDialog({
  stage,
  characterName,
  onStart,
  onClose,
}: {
  /** 열려 있으면 해금된 에피소드 단계, 닫혀 있으면 null */
  stage: number | null;
  characterName: string;
  onStart: (stage: number) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={stage != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-4 p-6 sm:max-w-sm" showCloseButton={false}>
        <DialogHeader className="items-center text-center">
          <DialogTitle className="text-lg font-semibold">New episode unlocked</DialogTitle>
          <DialogDescription className="leading-relaxed">
            Your relationship with {characterName} has reached{" "}
            <strong className="text-foreground">{stage != null && stageLabel(stage)}</strong>.
            <br />A new episode has been unlocked. Would you like to start it?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mx-0 mb-0 flex-row border-0 bg-transparent p-0">
          <Button variant="outline" size="lg" className="h-11 flex-1" onClick={onClose}>
            Close
          </Button>
          <Button
            size="lg"
            className="h-11 flex-1 font-bold"
            onClick={() => stage != null && onStart(stage)}
          >
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
