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
  metadataBase: new URL("https://h4sh.org"),
  title: {
    default: "h4sh.org — Zero-knowledge encrypted messaging",
    template: "%s | h4sh.org",
  },
  description:
    "Encrypt messages entirely in your browser and share only the ciphertext. h4sh.org keeps nothing but the hash.",
  keywords: [
    "h4sh",
    "encrypted messaging",
    "zero knowledge",
    "client-side encryption",
    "secure sharing",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "h4sh.org — Zero-knowledge encrypted messaging",
    description:
      "Encrypt messages entirely in your browser and share only the ciphertext. h4sh.org keeps nothing but the hash.",
    url: "https://h4sh.org",
    siteName: "h4sh.org",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://h4sh.org/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "h4sh.org – Zero-knowledge encrypted messaging",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "h4sh.org — Zero-knowledge encrypted messaging",
    description:
      "Encrypt messages entirely in your browser and share only the ciphertext. h4sh.org keeps nothing but the hash.",
    images: ["https://h4sh.org/og-image.jpg"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
