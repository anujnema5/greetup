import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
// @ts-ignore: side-effect CSS import without module declarations
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ReduxProvider } from "@/lib/redux/provider";
import { createPageMetadata } from "@/lib/routing/page-metadata";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = createPageMetadata("Greetup", "Find people who get you.");

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakartaSans.variable} antialiased font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ReduxProvider>{children}</ReduxProvider>
        </ThemeProvider>
        <Toaster position="bottom-right" closeButton />
      </body>
    </html>
  );
}
