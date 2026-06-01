import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trace — Follow the Path",
  description: "Share your exact location trail and drop voice notes along the way. Guide friends through crowds, estates, or group runs in real time.",
  keywords: ["location sharing", "voice drops", "path tracking", "real-time navigation", "group tracking"],
  authors: [{ name: "Trace" }],
  creator: "Trace",
  metadataBase: new URL("https://trace.app"),
  openGraph: {
    title: "Trace — Follow the Path",
    description: "Share your exact location trail and drop voice notes along the way.",
    siteName: "Trace",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trace — Follow the Path",
    description: "Share your exact location trail and drop voice notes along the way.",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: "#F5F5F7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
