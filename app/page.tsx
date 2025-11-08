import type { Metadata } from "next";

import HomePageClient from "./home-page-client";

const title = "Encrypt anything in seconds with h4sh.org";
const description =
  "Protect your words with client-side AES-256 GCM encryption and share only the ciphertext. Publish zero-knowledge hashes anyone can decrypt with the seed phrase.";

export function generateMetadata(): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title,
      description,
      url: "https://h4sh.org/",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function Home() {
  return <HomePageClient />;
}
