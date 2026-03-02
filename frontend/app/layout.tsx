import type { Metadata } from "next";
import { Bebas_Neue, Syne, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { AuthProvider } from "@/src/context/AuthContext";
import TeamPicker from "@/src/components/TeamPicker";
import CustomCursor from "@/src/components/CustomCursor";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

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
        className={`${bebasNeue.variable} ${syne.variable} ${jetbrainsMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <ThemeProvider>
            <CustomCursor />
            <TeamPicker />
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
