import type { Metadata } from "next";
import { Space_Grotesk, Syne, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { AuthProvider } from "@/src/context/AuthContext";
import { LanguageProvider } from "@/src/context/LanguageContext";
import { ToastProvider } from "@/src/context/ToastContext";
import TeamPicker from "@/src/components/TeamPicker";
import CustomCursor from "@/src/components/CustomCursor";
import KickoffBar from "@/src/components/KickoffBar";
import BackendProvider from "@/src/components/BackendProvider";

// Primary display — Space Grotesk 600 replaces Bebas Neue
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
});

// Mono — used ONLY for micro labels, countdown units, small tactical tags
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const BASE_URL = 'https://fanxi.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "FanXI — World Cup 2026 Tactical Hub",
    template: "%s | FanXI",
  },
  description: "The world's first tactical-first football prediction engine. Build your XI, predict the lineup, and prove your tactical IQ.",
  keywords: ["World Cup 2026", "football prediction", "tactical lineup", "fantasy football", "FIFA World Cup"],
  authors: [{ name: "FanXI" }],
  openGraph: {
    type: "website",
    siteName: "FanXI",
    title: "FanXI — World Cup 2026 Tactical Hub",
    description: "Build your XI, predict the lineup, prove your tactical IQ.",
    url: BASE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "FanXI — World Cup 2026 Tactical Hub",
    description: "Build your XI, predict the lineup, prove your tactical IQ.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  verification: {
    google: 'jRHUxG0RgLNWwZG4VvNHYuQrT8ltvxSjWSluUwA6cWk',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${syne.variable} ${jetbrainsMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {/* Fixed stadium background — content scrolls over it */}
        <div
          className="fixed top-0 left-0 w-screen h-screen -z-10 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/stadium-bg.jpg')",
          }}
        />
        <BackendProvider>
          <ToastProvider>
            <AuthProvider>
              <LanguageProvider>
                <ThemeProvider>
                  <CustomCursor />
                  <KickoffBar />
                  <TeamPicker />
                  {children}
                </ThemeProvider>
              </LanguageProvider>
            </AuthProvider>
          </ToastProvider>
        </BackendProvider>
      </body>
    </html>
  );
}
