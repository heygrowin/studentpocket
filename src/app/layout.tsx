import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Student Pocket by HeyGrow.in | AI Student Finance Manager",
  description: "Take control of your college expenses with Student Pocket by HeyGrow.in. AI-powered receipt scanning, natural language logging, and student loan tracking tailored for students.",
  keywords: ["student finance", "budget tracker", "expense manager", "receipt scanner", "education loan tracker", "college budget", "HeyGrow.in", "Student Pocket", "AI finance app"],
  authors: [{ name: "HeyGrow.in" }],
  creator: "HeyGrow.in",
  openGraph: {
    title: "Student Pocket by HeyGrow.in | AI Student Finance",
    description: "The intelligent financial operating system for students away from home.",
    url: "https://studentpocket.heygrow.in",
    siteName: "Student Pocket",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "Student Pocket Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Student Pocket by HeyGrow.in",
    description: "Manage your student budget effortlessly with AI.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
