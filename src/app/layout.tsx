import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { BottomNav } from "./bottom-nav";
import { TopNav } from "./top-nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Badminton Elo",
  description: "Hệ thống xếp hạng Elo cho CLB cầu lông",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900" suppressHydrationWarning>
        <TopNav />
        <main className="flex-1 max-w-2xl mx-auto w-full px-3 pt-4 pb-20 sm:px-4 sm:pt-6 sm:pb-6">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
