import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SocketProvider } from "@/lib/socket";
import { ReduxProvider } from "@/lib/redux/provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { CallDocPipBridge } from "@/components/call-doc-pip-bridge";
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
            <SocketProvider>
              <CallDocPipBridge />
              {children}
            </SocketProvider>
          </ReduxProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}