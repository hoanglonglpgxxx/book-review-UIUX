import type { Metadata } from "next";
import Script from "next/script";
import { DM_Sans, Fraunces, Oswald } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Book Review Platform",
  description: "Book reviews with basic auth and MongoDB conversation chat",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${dmSans.variable} ${fraunces.variable} ${oswald.variable}`}>
      <head>
        <link rel="preconnect" href="https://challenges.cloudflare.com" />
        <link rel="icon" href="/logo.svg" />
        <link rel="apple-touch-icon" href="/logo.svg" />
        <meta name="theme-color" content="#2a1f5c" />
        <meta name="msapplication-TileColor" content="#2a1f5c" />
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
