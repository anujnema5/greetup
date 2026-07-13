export type RoomActivityId = "chess" | "watch" | "draw" | "quiz" | "music" | "dare";

export type RoomActivityMeta = {
  id: RoomActivityId;
  label: string;
  emoji: string;
};
