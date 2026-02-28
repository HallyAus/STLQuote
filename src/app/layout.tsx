import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://crm.printforge.com.au"),
  title: {
    default: "Printforge — Free 3D Print Cost Calculator & Business Management Software",
    template: "%s | Printforge — 3D Print Cost Calculator",
  },
  description:
    "Free 3D print cost calculator and business management software. Calculate material, machine, and labour costs, generate professional quotes, track jobs, and invoice clients. Built for 3D print shops.",
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Printforge",
    title: "Printforge — Free 3D Print Cost Calculator & Business Management Software",
    description:
      "The complete business platform for 3D print shops. Calculate costs, send professional quotes, manage materials, track jobs, and invoice clients.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Printforge — Free 3D Print Cost Calculator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://crm.printforge.com.au",
    languages: {
      "en-AU": "https://crm.printforge.com.au",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
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
