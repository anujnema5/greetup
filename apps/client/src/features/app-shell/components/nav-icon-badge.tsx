/** Compact count pill overlaid on a nav icon (sidebar + bottom bar). */
export function NavIconBadge({ count }: { count: number }) {
  if (count < 1) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <span
      className="absolute right-0 top-0 z-10 inline-flex min-h-[15px] min-w-[15px] translate-x-[45%] -translate-y-[42%] items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-semibold leading-none text-primary-foreground"
      aria-hidden
    >
      {label}
    </span>
  );
}
