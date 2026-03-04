import type { Metadata } from "next";
import { Space_Grotesk, Syne, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { AuthProvider } from "@/src/context/AuthContext";
import TeamPicker from "@/src/components/TeamPicker";
import CustomCursor from "@/src/components/CustomCursor";
import KickoffBar from "@/src/components/KickoffBar";

// Primary display — Space Grotesk 600 replaces Bebas Neue
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

// Mono — used ONLY for micro labels, countdown units, small tactical tags
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "FanXI — World Cup 2026 Tactical Hub",
  description: "The world's first tactical-first football prediction engine.",
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
        <AuthProvider>
          <ThemeProvider>
            <CustomCursor />
            <KickoffBar />
            <TeamPicker />
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
