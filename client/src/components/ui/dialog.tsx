"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  dialogContentHasPixelCenterOffset,
  dialogContentKeyboardBottomPx,
  dialogViewportStyleForInlineMerge,
  useDialogContentAnchor,
  useDialogVisualViewportStyle,
} from "@/components/ui/use-dialog-visual-viewport-style"

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  overlayClassName,
  adaptVisualViewport = true,
  style,
  ref: refProp,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  overlayClassName?: string
  /** When true (default), reposition / inset for `visualViewport` (mobile keyboard, iOS Safari). Set false to opt out. */
  adaptVisualViewport?: boolean
}) {
  const anchor = useDialogContentAnchor(className)
  const visualViewportStyle = useDialogVisualViewportStyle(adaptVisualViewport, anchor)
  const viewportRef = React.useRef<HTMLDivElement | null>(null)

  // Mobile keyboard / visualViewport: see use-dialog-visual-viewport-style.ts module doc.
  const bottomInsetPx = dialogContentKeyboardBottomPx(adaptVisualViewport, anchor, visualViewportStyle)
  const viewportStyleForInline = dialogViewportStyleForInlineMerge(visualViewportStyle)
  const hasPixelCenterOffset = dialogContentHasPixelCenterOffset(
    adaptVisualViewport,
    anchor,
    visualViewportStyle,
  )

  const setContentRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      viewportRef.current = node
      if (typeof refProp === "function") {
        refProp(node)
      } else if (refProp) {
        ;(refProp as React.MutableRefObject<HTMLDivElement | null>).current = node
      }
    },
    [refProp],
  )

  React.useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return
    if (bottomInsetPx != null) {
      el.style.setProperty("bottom", `${bottomInsetPx}px`, "important")
    } else {
      el.style.removeProperty("bottom")
    }
  }, [bottomInsetPx])

  // Merge: consumer `style` first, then viewport — keyboard / inset wins on overlapping keys.
  const mergedStyle = { ...style, ...viewportStyleForInline }

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay className={overlayClassName} />
      <DialogPrimitive.Content
        ref={setContentRef}
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          !hasPixelCenterOffset && "translate-x-[-50%] translate-y-[-50%]",
          className
        )}
        style={mergedStyle}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 cursor-pointer rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
