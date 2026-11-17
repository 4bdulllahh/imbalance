import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { MoneyProvider } from "@/components/Money";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Imbalance",
  description:
    "Find profitable CS2 trade-ups and underpriced skins on your own PC.",
};

// Runs before paint so the saved theme never flashes. Dark is the default.
const themeScript = `try{if(localStorage.getItem("imbalance-theme")==="light")document.documentElement.classList.remove("dark")}catch(e){}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <MoneyProvider>
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
            {children}
          </main>
        </MoneyProvider>
      </body>
    </html>
  );
}
