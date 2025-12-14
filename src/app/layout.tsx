import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Personal Twin Network | AI-Powered Networking",
  description: "Your twin finds perfect people. Skip the small talk. Privacy-first AI networking for events.",
  keywords: ["networking", "AI", "digital twin", "events", "matching"],
  openGraph: {
    title: "Personal Twin Network",
    description: "Your twin finds perfect people. Skip the small talk.",
    type: "website",
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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1a1a2e" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${outfit.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
