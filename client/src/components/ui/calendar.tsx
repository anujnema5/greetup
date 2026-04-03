"use client";

import * as React from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";

import "react-day-picker/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * shadcn Calendar — react-day-picker with RDP default classes + theme accent variables.
 * @see https://ui.shadcn.com/docs/components/calendar
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  style,
  ...props
}: CalendarProps) {
  const defaults = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "rounded-md border border-border bg-background p-3 text-foreground shadow-sm",
        className,
      )}
      classNames={{
        ...defaults,
        ...classNames,
        root: cn(defaults.root, "w-fit", classNames?.root as string | undefined),
      }}
      style={
        {
          "--rdp-accent-color": "var(--color-primary)",
          "--rdp-accent-background-color":
            "color-mix(in oklch, var(--color-primary) 16%, transparent)",
          "--rdp-today-color": "var(--color-primary)",
          ...style,
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Calendar };
