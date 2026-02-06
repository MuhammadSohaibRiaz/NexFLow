import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
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
  title: "NexFlow - Automated Social Media Publishing",
  description: "Self-hosted automation platform for solo founders. Automate content creation and publishing across Facebook, LinkedIn, and more.",
  keywords: ["social media automation", "content scheduling", "AI content generation", "solo founders"],
  authors: [{ name: "RapidNexTech" }],
  openGraph: {
    title: "NexFlow - Automated Social Media Publishing",
    description: "Self-hosted automation platform for solo founders",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background`}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
