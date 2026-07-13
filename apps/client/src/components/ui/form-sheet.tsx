"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerCloseButton,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { cn } from "@/lib/utils";

type FormSheetMode = "dialog" | "drawer";

const FormSheetModeContext = createContext<FormSheetMode>("dialog");

function useFormSheetMode(): FormSheetMode {
  return useContext(FormSheetModeContext);
}

type FormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  contentClassName?: string;
  overlayClassName?: string;
  showCloseButton?: boolean;
  onOpenAutoFocus?: (event: Event) => void;
};

/** Desktop dialog / mobile drawer. Keyboard lift lives on `DrawerContent`. */
export function FormSheet({
  open,
  onOpenChange,
  children,
  contentClassName,
  overlayClassName,
  showCloseButton = true,
  onOpenAutoFocus,
}: FormSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shellClass = cn(
    "flex min-h-0 flex-col gap-0 overflow-hidden border-border/60 bg-card p-0 shadow-2xl",
    contentClassName,
  );

  // SSR + first paint: drawer (mobile-first). After mount, switch to dialog on sm+.
  if (mounted && isDesktop) {
    return (
      <FormSheetModeContext.Provider value="dialog">
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            showCloseButton={showCloseButton}
            overlayClassName={overlayClassName}
            onOpenAutoFocus={onOpenAutoFocus}
            className={cn(shellClass, "max-h-[min(90dvh,760px)] rounded-2xl")}
          >
            {children}
          </DialogContent>
        </Dialog>
      </FormSheetModeContext.Provider>
    );
  }

  return (
    <FormSheetModeContext.Provider value="drawer">
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          onOpenAutoFocus={onOpenAutoFocus}
          overlayClassName={overlayClassName}
          className={shellClass}
        >
          {showCloseButton ? <DrawerCloseButton /> : null}
          {children}
        </DrawerContent>
      </Drawer>
    </FormSheetModeContext.Provider>
  );
}

export function FormSheetHeader(props: ComponentProps<"div">) {
  const mode = useFormSheetMode();
  return mode === "dialog" ? (
    <DialogHeader {...props} />
  ) : (
    <DrawerHeader {...props} />
  );
}

export function FormSheetTitle(props: ComponentProps<typeof DialogTitle>) {
  const mode = useFormSheetMode();
  return mode === "dialog" ? (
    <DialogTitle {...props} />
  ) : (
    <DrawerTitle {...props} />
  );
}

export function FormSheetDescription(
  props: ComponentProps<typeof DialogDescription>,
) {
  const mode = useFormSheetMode();
  return mode === "dialog" ? (
    <DialogDescription {...props} />
  ) : (
    <DrawerDescription {...props} />
  );
}

export function FormSheetFooter(props: ComponentProps<"div">) {
  const mode = useFormSheetMode();
  return mode === "dialog" ? (
    <DialogFooter {...props} />
  ) : (
    <DrawerFooter {...props} />
  );
}
