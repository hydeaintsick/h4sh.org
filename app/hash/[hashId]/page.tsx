import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { DecryptPanel } from "./decrypt-panel";

type HashPageProps = {
  params: Promise<{ hashId: string }>;
};

export async function generateMetadata({
  params,
}: HashPageProps): Promise<Metadata> {
  const { hashId } = await params;

  return {
    title: `Decrypt secure hash ${hashId}`,
    description:
      "Enter the original seed phrase to decrypt this zero-knowledge message. h4sh.org only stores ciphertext, IV, salt, and expiry metadata.",
    alternates: {
      canonical: `/hash/${hashId}`,
    },
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
    openGraph: {
      title: `Decrypt hash ${hashId} · h4sh.org`,
      description:
        "Provide the matching seed phrase to decrypt this encrypted payload. Only ciphertext ever leaves the sender's browser.",
      url: `https://h4sh.org/hash/${hashId}`,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: `Decrypt secure hash ${hashId}`,
      description:
        "Use the correct seed phrase to reveal the encrypted message. h4sh.org never sees your secrets.",
    },
  };
}

export default async function HashPage({ params }: HashPageProps) {
  const { hashId } = await params;

  if (!hashId) {
    notFound();
  }

  const record = await prisma.hashMessage.findUnique({
    where: { hashId },
    select: {
      ciphertext: true,
      iv: true,
      salt: true,
      createdAt: true,
      expiresAt: true,
      autoDestroyOnRead: true,
    },
  });

  if (!record) {
    notFound();
  }

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top,_#172554_0%,_#020617_55%,_#000000_100%)] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-15%] top-[-5%] h-[420px] w-[420px] rounded-full bg-cyan-500/15 blur-[160px]" />
        <div className="absolute right-[-10%] top-1/3 h-[360px] w-[360px] rounded-full bg-purple-500/10 blur-[140px]" />
        <div className="absolute bottom-[-15%] left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[160px]" />
      </div>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col gap-12 px-6 py-16 md:px-10 lg:px-12">
        <nav className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-slate-400">
          <Link
            href="/"
            className="rounded-full border border-slate-500/40 px-4 py-2 transition hover:border-cyan-400/80 hover:text-cyan-300"
          >
            ← Back
          </Link>
          <span>h4sh.org</span>
        </nav>

        <DecryptPanel
          hashId={hashId}
          ciphertext={record.ciphertext}
          iv={record.iv}
          salt={record.salt}
          createdAt={record.createdAt.toISOString()}
          expiresAt={record.expiresAt?.toISOString() ?? null}
          autoDestroyOnRead={record.autoDestroyOnRead}
        />

        <section className="grid gap-6 rounded-3xl border border-white/10 bg-black/30 p-8 backdrop-blur">
          <h2 className="text-lg font-medium text-slate-100">
            Stored payload overview
          </h2>
          <p className="text-sm text-slate-400">
            We store only the data required to recreate the encrypted message.
            Nothing about your seed phrase or identity ever touches our servers.
          </p>
          <div className="grid gap-4 md:grid-cols-4">
            <article className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold text-cyan-300/80">
                Ciphertext
              </p>
              <p className="line-clamp-3 break-all text-xs text-slate-200/90">
                {record.ciphertext}
              </p>
            </article>
            <article className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold text-purple-300/80">IV</p>
              <p className="break-all text-xs text-slate-200/90">{record.iv}</p>
            </article>
            <article className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold text-emerald-300/80">Salt</p>
              <p className="break-all text-xs text-slate-200/90">
                {record.salt}
              </p>
            </article>
            <article className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold text-slate-300/80">Expiry</p>
              <p className="text-xs text-slate-200/90">
                {record.expiresAt
                  ? new Date(record.expiresAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "No expiry configured"}
              </p>
              {record.autoDestroyOnRead && (
                <p className="text-[11px] font-medium text-rose-200/80">
                  One-time reveal enabled
                </p>
              )}
            </article>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-black/30 px-6 py-10 text-xs text-slate-400 md:px-10 lg:px-12">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="uppercase tracking-[0.35em] text-slate-500">
            Zero knowledge. Open future.
          </p>
          <Link
            href="https://github.com/hydeaintsick/h4sh.org"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-slate-500/40 px-4 py-2 uppercase tracking-[0.35em] text-slate-300 transition hover:border-cyan-400/80 hover:text-cyan-300"
          >
            GitHub
            <span>↗</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
