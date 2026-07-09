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

/**
 * Desktop: centered dialog. Mobile: bottom drawer (Vaul) with keyboard offset.
 * Pattern from shadcn responsive drawer + github.com/shadcn-ui/ui/issues/2849.
 */
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
    "flex min-h-0 flex-col gap-0 overflow-hidden p-0",
    "border-border/60 bg-card shadow-2xl",
    contentClassName,
  );

  const mode: FormSheetMode =
    mounted && isDesktop ? "dialog" : "drawer";

  if (mode === "dialog") {
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

export function FormSheetHeader({
  className,
  ...props
}: ComponentProps<"div">) {
  const mode = useFormSheetMode();
  if (mode === "dialog") {
    return <DialogHeader className={className} {...props} />;
  }
  return <DrawerHeader className={className} {...props} />;
}

export function FormSheetTitle({
  className,
  ...props
}: ComponentProps<typeof DialogTitle>) {
  const mode = useFormSheetMode();
  if (mode === "dialog") {
    return <DialogTitle className={className} {...props} />;
  }
  return <DrawerTitle className={className} {...props} />;
}

export function FormSheetDescription({
  className,
  ...props
}: ComponentProps<typeof DialogDescription>) {
  const mode = useFormSheetMode();
  if (mode === "dialog") {
    return <DialogDescription className={className} {...props} />;
  }
  return <DrawerDescription className={className} {...props} />;
}

export function FormSheetFooter({
  className,
  ...props
}: ComponentProps<"div">) {
  const mode = useFormSheetMode();
  if (mode === "dialog") {
    return <DialogFooter className={className} {...props} />;
  }
  return <DrawerFooter className={className} {...props} />;
}
