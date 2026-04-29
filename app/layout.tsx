import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";
import { I18nProvider } from "@/components/I18nProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Auto Reader - AI Voice Reading",
  description: "AI-powered article analysis and voice reading with MiMo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      >
        <ThemeProvider>
          <I18nProvider>
            <Header />
            <main className="flex-1">{children}</main>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
