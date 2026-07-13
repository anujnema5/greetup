import { nameInitials } from "@/lib/utils/name-initials";
import { cn } from "@/lib/utils";

type Props = {
  imageUrl: string | null;
  title: string;
  size?: "md" | "lg";
};

const sizeClass = {
  md: "h-16 w-16 text-lg",
  lg: "h-24 w-24 text-2xl shadow-lg shadow-primary/20",
} as const;

export function PublicProfileAvatar({ imageUrl, title, size = "lg" }: Props) {
  return (
    <div
      className={cn(
        "rounded-full bg-linear-to-br from-primary/80 to-primary flex items-center justify-center font-bold text-primary-foreground overflow-hidden",
        sizeClass[size],
      )}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        nameInitials(title)
      )}
    </div>
  );
}
