"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type GridBreakpoint = "md" | "lg";

type Props = {
  children: ReactNode;
  itemCount: number;
  /** Grid classes applied from the desktop breakpoint upward. */
  desktopClassName: string;
  /** When the layout switches from carousel to grid. Defaults to `lg`. */
  gridBreakpoint?: GridBreakpoint;
  mobileSlideClassName?: string;
  ariaLabel?: string;
  className?: string;
};

const GRID_BREAKPOINT_CLASSES: Record<
  GridBreakpoint,
  { container: string; slide: string; pagination: string }
> = {
  md: {
    container: "md:mx-0 md:grid md:gap-3 md:overflow-visible md:snap-none md:px-0",
    slide: "md:w-auto md:max-w-none md:min-w-0",
    pagination: "md:hidden",
  },
  lg: {
    container: "lg:mx-0 lg:grid lg:gap-3 lg:overflow-visible lg:snap-none lg:px-0",
    slide: "lg:w-auto lg:max-w-none lg:min-w-0",
    pagination: "lg:hidden",
  },
};

export function HorizontalCardCarousel({
  children,
  itemCount,
  desktopClassName,
  gridBreakpoint = "lg",
  mobileSlideClassName = "w-[min(88%,320px)] shrink-0 snap-start sm:w-[min(78%,340px)]",
  ariaLabel = "Carousel",
  className,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const showPagination = itemCount > 1;
  const childArray = Children.toArray(children);
  const breakpoint = GRID_BREAKPOINT_CLASSES[gridBreakpoint];

  const updateActiveIndexFromScroll = useCallback(() => {
    const root = scrollRef.current;
    if (!root || itemCount <= 1) return;

    const maxScroll = root.scrollWidth - root.clientWidth;
    if (maxScroll <= 0) {
      setActiveIndex(0);
      return;
    }
    if (root.scrollLeft >= maxScroll - 8) {
      setActiveIndex(itemCount - 1);
      return;
    }
    if (root.scrollLeft <= 8) {
      setActiveIndex(0);
      return;
    }

    let closest = 0;
    let minDistance = Infinity;
    slideRefs.current.forEach((slide, index) => {
      if (!slide) return;
      const distance = Math.abs(slide.offsetLeft - root.scrollLeft);
      if (distance < minDistance) {
        minDistance = distance;
        closest = index;
      }
    });
    setActiveIndex(closest);
  }, [itemCount]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    updateActiveIndexFromScroll();
    root.addEventListener("scroll", updateActiveIndexFromScroll, { passive: true });
    return () => root.removeEventListener("scroll", updateActiveIndexFromScroll);
  }, [updateActiveIndexFromScroll, childArray.length]);

  const scrollToIndex = useCallback((index: number) => {
    const slide = slideRefs.current[index];
    if (!slide) return;
    slide.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    setActiveIndex(index);
  }, []);

  slideRefs.current.length = childArray.length;

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollRef}
        className={cn(
          "flex gap-3 overflow-x-auto pb-0.5",
          "snap-x snap-mandatory scroll-smooth",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          "-mx-4 px-4",
          breakpoint.container,
          desktopClassName,
        )}
        role="region"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
      >
        {childArray.map((child, index) => {
          const key = isValidElement(child) && child.key != null ? child.key : index;
          return (
            <div
              key={key}
              ref={(node) => {
                slideRefs.current[index] = node;
              }}
              className={cn(
                mobileSlideClassName,
                itemCount === 1 && "w-full max-w-none sm:max-w-sm",
                "flex flex-col",
                breakpoint.slide,
              )}
              aria-hidden={showPagination ? activeIndex !== index : undefined}
            >
              {child}
            </div>
          );
        })}
      </div>

      {showPagination ? (
        <div
          className={cn(
            "mt-3 flex items-center justify-center gap-1.5",
            breakpoint.pagination,
          )}
          role="tablist"
          aria-label={`${ariaLabel} pages`}
        >
          {childArray.map((_, index) => (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={activeIndex === index}
              aria-label={`Page ${index + 1} of ${itemCount}`}
              onClick={() => scrollToIndex(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 ease-out",
                activeIndex === index
                  ? "w-5 bg-primary"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
