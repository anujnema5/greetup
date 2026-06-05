export type NsfwClassName = "Drawing" | "Hentai" | "Neutral" | "Porn" | "Sexy";

export type NsfwPrediction = {
  className: NsfwClassName;
  probability: number;
};

export function isNsfwPrediction(predictions: NsfwPrediction[]): boolean {
  return (
    predictions.some(
      (p) =>
        (["Porn", "Hentai"] as const).includes(p.className as "Porn" | "Hentai") &&
        p.probability > 0.7,
    ) || predictions.some((p) => p.className === "Sexy" && p.probability > 0.85)
  );
}
