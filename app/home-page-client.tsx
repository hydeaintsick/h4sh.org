"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  MIN_SEED_LENGTH,
  MIN_SEED_SCORE,
  assessSeedStrength,
  encryptMessage,
  isCryptoAvailable,
} from "@/lib/crypto";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function formatDateTimeForDisplay(date: Date) {
  try {
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return date.toISOString();
  }
}

function toDatetimeLocalValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function HomePageClient() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [seed, setSeed] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoDestroyOnRead, setAutoDestroyOnRead] = useState(false);
  const [expiresAtInput, setExpiresAtInput] = useState("");
  const [totalMessages, setTotalMessages] = useState<number | null>(null);
  const [isFetchingStats, setIsFetchingStats] = useState(true);
  const [showWeakSeedModal, setShowWeakSeedModal] = useState(false);
  const [weakSeedConfirmed, setWeakSeedConfirmed] = useState(false);
  const [isWeakSeedConfirming, setIsWeakSeedConfirming] = useState(false);

  const strength = useMemo(() => assessSeedStrength(seed), [seed]);
  const strengthPercent = useMemo(
    () => Math.min(100, Math.round((strength.score / 4) * 100)),
    [strength.score]
  );
  const defaultExpiry = useMemo(
    () => new Date(Date.now() + THIRTY_DAYS_MS),
    []
  );
  const defaultExpiryLabel = useMemo(
    () => formatDateTimeForDisplay(defaultExpiry),
    [defaultExpiry]
  );
  const defaultExpiryInputValue = useMemo(
    () => toDatetimeLocalValue(defaultExpiry),
    [defaultExpiry]
  );

  const isWeakSeed = strength.score < MIN_SEED_SCORE;

  const canSubmit =
    !isSubmitting &&
    message.trim().length > 0 &&
    seed.length >= MIN_SEED_LENGTH;

  useEffect(() => {
    let cancelled = false;

    async function fetchStats() {
      try {
        const response = await fetch("/api/stats", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch stats");
        }

        const data: { totalMessagesCreated?: number } = await response.json();

        if (!cancelled) {
          setTotalMessages(data.totalMessagesCreated ?? 0);
        }
      } catch (statsError) {
        console.error(statsError);
        if (!cancelled) {
          setTotalMessages(null);
        }
      } finally {
        if (!cancelled) {
          setIsFetchingStats(false);
        }
      }
    }

    fetchStats();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setWeakSeedConfirmed(false);
    setShowWeakSeedModal(false);
  }, [seed]);

  const minExpiryInputValue = toDatetimeLocalValue(
    new Date(Date.now() + 60 * 1000)
  );
  const counterDisplay = useMemo(() => {
    if (isFetchingStats) {
      return "Loading counter…";
    }
    if (totalMessages === null) {
      return "Counter unavailable";
    }
    return `${totalMessages.toLocaleString()} messages encrypted`;
  }, [isFetchingStats, totalMessages]);

  async function submitMessage(allowWeakSeedOverride = false) {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setError("Please enter a message to encrypt.");
      return;
    }

    if (seed.length < MIN_SEED_LENGTH) {
      setError(`Seed phrase must be at least ${MIN_SEED_LENGTH} characters.`);
      return;
    }

    if (isWeakSeed && !allowWeakSeedOverride && !weakSeedConfirmed) {
      setShowWeakSeedModal(true);
      return;
    }

    if (!isCryptoAvailable()) {
      setError(
        "Encryption is not supported in this browser. Please try a compatible browser."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const derivedExpiry = expiresAtInput
        ? new Date(expiresAtInput)
        : new Date(Date.now() + THIRTY_DAYS_MS);

      if (Number.isNaN(derivedExpiry.getTime())) {
        throw new Error("Please choose a valid expiration date.");
      }

      if (derivedExpiry.getTime() <= Date.now()) {
        throw new Error("Expiration date must be in the future.");
      }

      const { ciphertext, iv, salt } = await encryptMessage(
        trimmedMessage,
        seed
      );

      const response = await fetch("/api/hash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ciphertext,
          iv,
          salt,
          autoDestroyOnRead,
          expiresAt: derivedExpiry.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save encrypted message.");
      }

      const data = await response.json();
      router.push(`/hash/${data.hashId}`);
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    await submitMessage(false);
  }

  async function handleConfirmWeakSeed() {
    setShowWeakSeedModal(false);
    setError(null);
    setWeakSeedConfirmed(true);
    setIsWeakSeedConfirming(true);
    try {
      await submitMessage(true);
    } finally {
      setIsWeakSeedConfirming(false);
    }
  }

  function handleCancelWeakSeed() {
    setShowWeakSeedModal(false);
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[200px]" />
        <div className="absolute bottom-[-15%] right-[-5%] h-[420px] w-[420px] rounded-full bg-purple-500/10 blur-[200px]" />
        <div className="absolute left-[-10%] top-1/3 h-[360px] w-[360px] rounded-full bg-sky-500/10 blur-[180px]" />
      </div>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-24 px-6 py-16 pb-32 md:px-12 lg:px-16">
        <header className="flex flex-col gap-16 pt-6">
          <nav className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-lg font-semibold tracking-tight text-white">
                h4sh.org
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200/90">
                {counterDisplay}
              </span>
            </div>
            <Link
              href="#hash-form"
              className="inline-flex items-center gap-2 rounded-full bg-cyan-400/90 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Create a hash
              <span aria-hidden className="translate-y-[1px]">→</span>
            </Link>
          </nav>

          <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="flex flex-col gap-8">
              <p className="text-sm font-medium text-cyan-300/90">
                Privacy for everyone
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-slate-50 sm:text-5xl lg:text-6xl">
                Encrypt anything in seconds. Publish nothing but the cipher.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
                h4sh.org is a non-profit public utility dedicated to global
                privacy. Encrypt your words entirely in your browser, keep your
                seed phrase, and share a zero-knowledge link anywhere.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="#hash-form"
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/20"
                >
                  Hash my message
                </Link>
                <Link
                  href="#mission"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-slate-200 transition hover:border-white/40"
                >
                  Our mission
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-white/10 blur-3xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_12px_80px_rgba(15,23,42,0.45)] backdrop-blur">
                <div className="flex items-center justify-between text-xs font-medium uppercase text-slate-300/80">
                  <span>Encrypted snapshot</span>
                  <span>Zero knowledge</span>
                </div>
                <div className="mt-6 space-y-4 text-sm text-slate-200/90">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300/80">
                      Ciphertext
                    </p>
                    <p className="mt-2 font-mono text-[13px] leading-6 text-slate-100/90">
                      QmFzZTY0LkFsbC4uQ2lwaGVycw==
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-300/80">
                        IV
                      </p>
                      <p className="mt-2 font-mono text-[13px] text-slate-100/90">
                        9jBq1+H0qNs=
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300/80">
                        Salt
                      </p>
                      <p className="mt-2 font-mono text-[13px] text-slate-100/90">
                        mhy2wZ5R1r4=
                      </p>
                    </div>
                  </div>
                  <p className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-slate-200/80">
                    “Only the encrypted payload ever leaves your browser.”
                  </p>
                </div>
              </div>
            </div>
          </section>
        </header>

        <section
          id="hash-form"
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-10 shadow-[0_12px_80px_rgba(15,23,42,0.65)] backdrop-blur-xl"
        >
          <div className="absolute left-[-20%] top-[-10%] h-[320px] w-[320px] rounded-full bg-cyan-500/10 blur-[140px]" />
          <div className="absolute bottom-[-20%] right-[-10%] h-[280px] w-[280px] rounded-full bg-purple-500/10 blur-[140px]" />
          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-3xl font-semibold text-slate-50">
                  Encrypt & publish in one move
                </h2>
                <p className="mt-3 max-w-xl text-base text-slate-300/90">
                  Your message is encrypted locally with AES-256 GCM and a key
                  derived from your seed phrase using PBKDF2. h4sh.org stores
                  only the encrypted payload.
                </p>
              </div>

              <form className="space-y-8" onSubmit={handleSubmit}>
                <div className="space-y-3">
                  <label
                    htmlFor="message"
                    className="text-sm font-medium text-slate-200"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    placeholder="Write anything you need to protect..."
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={6}
                    className="w-full resize-none rounded-3xl border border-white/20 bg-black/40 px-6 py-4 text-base text-slate-100 shadow-inner outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/40"
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <label
                      htmlFor="seed"
                      className="text-sm font-medium text-slate-200"
                    >
                      Seed phrase
                    </label>
                    <input
                      id="seed"
                      name="seed"
                      type="text"
                      placeholder="Mix words, numbers & symbols for strength"
                      value={seed}
                      onChange={(event) => setSeed(event.target.value)}
                      className="w-full rounded-3xl border border-white/20 bg-black/40 px-6 py-4 text-base text-slate-100 shadow-inner outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/40"
                    />
                  </div>
                  <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide">
                      <span className="text-slate-400">Strength</span>
                      <span
                        className={
                          strength.score >= MIN_SEED_SCORE
                            ? "text-emerald-300"
                            : "text-amber-300"
                        }
                      >
                        {strength.label}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-700/70">
                      <div
                        style={{ width: `${strengthPercent}%` }}
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          strength.score >= MIN_SEED_SCORE
                            ? "bg-emerald-400"
                            : "bg-amber-400"
                        }`}
                      />
                    </div>
                    <p className="text-xs text-slate-400">
                      Aim for at least {MIN_SEED_LENGTH} characters with mixed
                      cases, numbers, and symbols.
                    </p>
                    {strength.suggestions.length > 0 && (
                      <ul className="space-y-1 text-xs text-slate-400">
                        {strength.suggestions.map((hint) => (
                          <li key={hint}>• {hint}</li>
                        ))}
                      </ul>
                    )}
                    {isWeakSeed && (
                      <p className="rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200/90">
                        This seed phrase looks weak. Consider adding more words,
                        numbers, and symbols to increase entropy.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-5 rounded-3xl border border-white/10 bg-black/40 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-100">
                        One-time reveal
                      </p>
                      <p className="text-sm text-slate-400">
                        Delete the encrypted payload after the first successful
                        decrypt.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoDestroyOnRead}
                      onClick={() => {
                        setAutoDestroyOnRead((previous) => !previous);
                        if (!autoDestroyOnRead) {
                          setExpiresAtInput("");
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        autoDestroyOnRead ? "bg-emerald-400" : "bg-slate-600"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          autoDestroyOnRead ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  {!autoDestroyOnRead && (
                    <div className="space-y-2">
                      <label
                        htmlFor="expiresAt"
                        className="text-sm font-medium text-slate-200"
                      >
                        Custom expiration
                      </label>
                      <input
                        id="expiresAt"
                        name="expiresAt"
                        type="datetime-local"
                        value={expiresAtInput}
                        onChange={(event) =>
                          setExpiresAtInput(event.target.value)
                        }
                        min={minExpiryInputValue}
                        placeholder={defaultExpiryInputValue}
                        className="w-full rounded-2xl border border-white/20 bg-black/50 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                      />
                      <p className="text-xs text-slate-400">
                        Leave empty to keep the default expiry:{" "}
                        {defaultExpiryLabel}.
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100/90">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cyan-400/90 px-8 py-3 text-sm font-semibold text-slate-950 transition enabled:hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-600/40 disabled:text-slate-400"
                >
                  {isSubmitting ? "Publishing..." : "Publish encrypted hash"}
                </button>
              </form>
            </div>

            <div className="space-y-6 rounded-3xl border border-white/10 bg-black/30 p-6 shadow-inner">
              <h3 className="text-xl font-medium text-slate-100">
                Transparency check
              </h3>
              <ul className="space-y-4 text-sm text-slate-300/80">
                <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold text-cyan-200/90">
                    Client-side encryption
                  </p>
                  <p className="mt-2">
                    AES-256 GCM runs entirely in your browser using the Web
                    Crypto API. We never see your seed phrase.
                  </p>
                </li>
                <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold text-purple-200/90">
                    Minimal storage
                  </p>
                  <p className="mt-2">
                    We store only the ciphertext, IV, salt, and timestamp in our
                    database. Nothing else.{" "}
                    <Link
                      href="https://github.com/hydeaintsick/h4sh.org"
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-300 underline decoration-transparent transition hover:decoration-cyan-300"
                    >
                      Don&apos;t trust us? Check out the codebase.
                    </Link>
                  </p>
                </li>
                <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold text-emerald-200/90">
                    Instant share
                  </p>
                  <p className="mt-2">
                    Once published, share the unique URL. Anyone with the seed
                    phrase can decrypt instantly.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section
          id="mission"
          className="grid gap-12 rounded-3xl border border-white/10 bg-black/30 p-10 shadow-[0_12px_80px_rgba(15,23,42,0.65)] backdrop-blur"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-cyan-300/90">
                Our mission
              </p>
              <h2 className="text-3xl font-semibold text-slate-50">
                A commons for encrypted communication.
              </h2>
              <p className="text-base text-slate-300/80">
                Privacy is a right, not a luxury. We design public tools that
                amplify trust and protect speech. h4sh.org removes barriers to
                encryption so every message—activists, journalists, friends, and
                families—can stay safe.
              </p>
            </div>
            <ul className="space-y-4 text-sm text-slate-300/80">
              <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Built as a non-lucrative public organization with no ads and no
                tracking.
              </li>
              <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
                Open source and auditable on GitHub—our roadmap belongs to the
                community.
              </li>
              <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
                We pledge zero data retention beyond what is required to deliver
                encrypted payloads.
              </li>
            </ul>
          </div>

          <div className="grid gap-10 lg:grid-cols-3">
            {[
              {
                title: "Encrypt",
                copy: "Write your message and craft a powerful seed phrase. Everything happens in your browser.",
              },
              {
                title: "Publish",
                copy: "We store only the encrypted blob. You receive a unique hash URL ready to share anywhere.",
              },
              {
                title: "Reveal",
                copy: "Anyone with the link and seed phrase can decrypt instantly—no accounts, no friction.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <p className="text-xs font-semibold text-slate-300/90">
                  {item.title}
                </p>
                <p className="text-base text-slate-200/90">{item.copy}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-black/40 px-6 py-10 text-xs text-slate-400 md:px-12 lg:px-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="uppercase tracking-[0.35em] text-slate-500">
            h4sh.org · privacy for everyone
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

      {showWeakSeedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-6 py-12">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="weak-seed-title"
            className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
          >
            <div className="space-y-3">
              <h2 id="weak-seed-title" className="text-xl font-semibold text-white">
                Seed phrase looks weak
              </h2>
              <p className="text-sm text-slate-300">
                This seed phrase may be easy to guess. We recommend adding more
                words, numbers, or symbols before publishing. Do you want to
                continue anyway?
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCancelWeakSeed}
                className="inline-flex items-center justify-center rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:text-white"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={handleConfirmWeakSeed}
                disabled={isWeakSeedConfirming || isSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-amber-400/90 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-amber-400/50"
              >
                {isWeakSeedConfirming || isSubmitting
                  ? "Publishing..."
                  : "Publish anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

