import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
// Commented out to resolve the conflict and keep layout peace
// import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
      <head>
        <Script id="pendo-install" strategy="beforeInteractive">{`
(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('79b4ac85-fc1f-4697-8874-a3605978de4a');
        `}</Script>
      </head>
      <body className="min-h-full flex flex-col">

        {children}
      </body>
    </html>
  );
}