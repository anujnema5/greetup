"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { XIcon } from "lucide-react";

import { useDrawerKeyboardOffset } from "@/lib/ui/use-drawer-keyboard-offset";
import { cn } from "@/lib/utils";

function Drawer({
  /** Vaul's auto-reposition fights the keyboard; keep off by default. */
  repositionInputs = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return (
    <DrawerPrimitive.Root
      data-slot="drawer"
      repositionInputs={repositionInputs}
      {...props}
    />
  );
}

function DrawerTrigger(
  props: React.ComponentProps<typeof DrawerPrimitive.Trigger>,
) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal(
  props: React.ComponentProps<typeof DrawerPrimitive.Portal>,
) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose(
  props: React.ComponentProps<typeof DrawerPrimitive.Close>,
) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  adaptKeyboard = true,
  overlayClassName,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  adaptKeyboard?: boolean;
  overlayClassName?: string;
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  useDrawerKeyboardOffset(contentRef, adaptKeyboard);

  return (
    <DrawerPortal>
      <DrawerOverlay className={overlayClassName} />
      <DrawerPrimitive.Content
        ref={contentRef}
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content fixed z-50 flex h-auto flex-col bg-background outline-none",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0",
          "data-[vaul-drawer-direction=bottom]:max-h-[min(92dvh,880px)]",
          "data-[vaul-drawer-direction=bottom]:rounded-t-[1.75rem] data-[vaul-drawer-direction=bottom]:border-t",
          className,
        )}
        {...props}
      >
        <div
          className="mx-auto mt-3 hidden h-1 w-12 shrink-0 rounded-full bg-muted-foreground/30 group-data-[vaul-drawer-direction=bottom]/drawer-content:block"
          aria-hidden
        />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-lg font-semibold leading-none", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function DrawerCloseButton({ className }: { className?: string }) {
  return (
    <DrawerClose
      className={cn(
        "absolute top-4 right-4 cursor-pointer rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden",
        className,
      )}
    >
      <XIcon className="size-4" />
      <span className="sr-only">Close</span>
    </DrawerClose>
  );
}

export {
  Drawer,
  DrawerClose,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
};
