import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://crm.printforge.com.au"),
  title: {
    default: "Printforge Quote — 3D Print Cost Calculator & Business Management",
    template: "%s | Printforge Quote",
  },
  description:
    "Stop guessing your 3D print costs. Calculate material, machine, and labour costs, send professional quotes, manage inventory, and track jobs — all self-hosted.",
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Printforge Quote",
    title: "Printforge Quote — 3D Print Cost Calculator & Business Management",
    description:
      "The complete business tool for 3D print shops. Calculate costs, send professional quotes, manage materials, and track jobs.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
