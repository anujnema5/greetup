import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function ExploreSearchField({
  value,
  onChange,
  placeholder = "Type at least 2 characters…",
}: Props) {
  return (
    <div className="relative">
      <Search
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        aria-hidden
      />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-muted/40 pl-9 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/40 transition"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  );
}
