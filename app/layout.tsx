import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JRs - WEB MIDI MUSIC",
  description: "A web-based MIDI controller with realistic piano sounds and synthesizer capabilities",
  generator: "DeepSeek",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    other: [
      { rel: "maskable-icon", url: "/icon-192-maskable.png", sizes: "192x192" },
      { rel: "maskable-icon", url: "/icon-512-maskable.png", sizes: "512x512" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        {/* Meta Tags */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />

        {/* Open Graph */}
        <meta property="og:title" content="JRs - WEB MIDI MUSIC" />
        <meta
          property="og:description"
          content="A web-based MIDI controller with realistic piano sounds and synthesizer capabilities"
        />
        <meta property="og:image" content="https://web-midi-music.vercel.app/og-preview.png" />
        <meta property="og:url" content="https://web-midi-music.vercel.app/" />
        <meta property="og:site_name" content="WEB MIDI MUSIC" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="JRs - WEB MIDI MUSIC" />
        <meta
          name="twitter:description"
          content="A web-based MIDI controller with realistic piano sounds and synthesizer capabilities"
        />
        <meta name="twitter:image" content="https://web-midi-music.vercel.app/og-preview.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}

