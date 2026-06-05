import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Trace — Show people exactly where to go.",
  description: "Walk the route once, leave photos, notes, or voice messages along the way, and share a single link. Friends follow your exact path.",
  keywords: ["route sharing", "gps tracking", "custom maps", "waypoint navigation", "trace path", "location trails"],
  authors: [{ name: "Trace Team" }],
  
  // OpenGraph (Facebook, WhatsApp, Slack, iMessage Link Previews)
  openGraph: {
    title: "Trace — Show people exactly where to go.",
    description: "Walk the route once, leave photos, notes, or voice messages along the way, and share a single link.",
    url: "https://trace.so", // Swap with your actual production custom domain
    siteName: "Trace",
    locale: "en_US",
    type: "website",
  },

  // Twitter Card Metadata
  twitter: {
    card: "summary_large_image",
    title: "Trace — Show people exactly where to go.",
    description: "Walk the route once, leave photos, notes, or voice messages along the way, and share a single link.",
  },

  // Mobile Application Optimization
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Trace",
  },

  // Search Engine Bots Settings
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* The exact Pendo script Novus needs to track everything */}
        <Script id="pendo-install" strategy="beforeInteractive">{`
(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('79b4ac85-fc1f-4697-8874-a3605978de4a');
        `}</Script>
        <Script id="pendo-init" strategy="beforeInteractive">{`
pendo.initialize({
  visitor: {
    id: ''
  }
});
        `}</Script>
      </head>
      <body className="antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}