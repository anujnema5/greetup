import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/lib/socket";
import { ReduxProvider } from "@/lib/redux/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { CallMinimizedHydration, MinimizedCallDock } from "@/features/call";
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Circlo",
  description: "Your vibe finds your tribe.",
};

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
          <ReduxProvider>
            <CallMinimizedHydration />
            <SocketProvider>
              <Suspense fallback={null}>
                <MinimizedCallDock />
              </Suspense>
              {children}
            </SocketProvider>
          </ReduxProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}