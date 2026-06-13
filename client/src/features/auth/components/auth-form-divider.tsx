import { Separator } from "@/components/ui/separator";

type AuthFormDividerProps = {
  label: string;
};

/** Visual divider with a single accessible label (decorative lines hidden from AT). */
export function AuthFormDivider({ label }: AuthFormDividerProps) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <Separator />
      </div>
      <p className="relative m-0 flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">{label}</span>
      </p>
    </div>
  );
}
