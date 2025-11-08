"use client";

import Link from "next/link";

export default function HashNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-slate-200">
      <div className="mx-6 max-w-md space-y-6 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">
          Hash not found
        </p>
        <h1 className="text-3xl font-semibold">
          This encrypted message is no longer available.
        </h1>
        <p className="text-sm text-slate-400">
          It may have expired, been removed, or never existed. You can always
          create a fresh encrypted message on h4sh.org.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-500/40 px-5 py-2 uppercase tracking-[0.35em] text-slate-300 transition hover:border-cyan-400/80 hover:text-cyan-300"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}

