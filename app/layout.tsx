import type { Metadata } from "next";
import Script from "next/script";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import PendoPageTracker from "@/components/PendoPageTracker";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
});

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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={`antialiased ${plusJakarta.variable}`}>
        <ToastProvider>
          <PendoPageTracker />
          {children}
        </ToastProvider>
        <Script id="pendo-install" strategy="afterInteractive">{`
(function(apiKey){
    (function(p,e,n,d,o){var v,w,x,y,z;o=p[d]=p[d]||{};o._q=o._q||[];
    v=['initialize','identify','updateOptions','pageLoad','track', 'trackAgent'];for(w=0,x=v.length;w<x;++w)(function(m){
    o[m]=o[m]||function(){o._q[m===v[0]?'unshift':'push']([m].concat([].slice.call(arguments,0)));};})(v[w]);
    y=e.createElement(n);y.async=!0;y.src='https://cdn.pendo.io/agent/static/'+apiKey+'/pendo.js';
    z=e.getElementsByTagName(n)[0];z.parentNode.insertBefore(y,z);})(window,document,'script','pendo');
})('79b4ac85-fc1f-4697-8874-a3605978de4a');
        `}</Script>
        <Script id="pendo-init" strategy="afterInteractive">{`
(function() {
  var vid = localStorage.getItem('pendo_visitor_id');
  if (!vid) {
    vid = 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('pendo_visitor_id', vid);
  }
  pendo.initialize({
    visitor: { id: vid }
  });
})();
        `}</Script>
      </body>
    </html>
  );
}