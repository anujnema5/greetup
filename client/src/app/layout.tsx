import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
// @ts-ignore: side-effect CSS import without module declarations
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SiteJsonLd } from "@/components/seo/site-json-ld";
import { ApiPreconnect } from "@/components/seo/api-preconnect";
import { SiteGoogleAnalytics } from "@/components/analytics/google-analytics";
import { rootMetadata } from "@/lib/site";
import { QueryProviderShell } from "@/lib/providers/query-provider-shell";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = rootMetadata;

/**
 * Let the virtual keyboard overlay the page (Chrome/Android) instead of resizing the whole
 * layout viewport. Matches iOS Safari's default and keeps `dvh`/`svh` stable while the keyboard
 * is open, so dialogs don't get resized twice (once by the browser, once by our own
 * `visualViewport` logic in `use-dialog-visual-viewport-style.ts`). We reposition dialogs above
 * the keyboard ourselves via `visualViewport` instead.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ApiPreconnect />
      </head>
      <body className={`${plusJakartaSans.variable} antialiased font-sans`}>
        <SiteJsonLd />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProviderShell>
            <Suspense fallback={null}>{children}</Suspense>
          </QueryProviderShell>
          <Toaster position="bottom-right" closeButton />
        </ThemeProvider>
      </body>
      <SiteGoogleAnalytics />
    </html>
  );
}
