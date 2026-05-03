import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter_Tight } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const fontSans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const fontMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fontHeading = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PeopleCore Admin",
  description: "Internal admin dashboard — 224tech team only",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} ${fontHeading.variable} antialiased`}
      >
        <ClerkProvider>
          {children}
          <Toaster richColors position="top-right" />
        </ClerkProvider>
      </body>
    </html>
  );
}
