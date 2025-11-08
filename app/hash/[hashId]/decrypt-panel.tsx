"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { decryptMessage, isCryptoAvailable } from "@/lib/crypto";

type DecryptPanelProps = {
  hashId: string;
  ciphertext: string;
  iv: string;
  salt: string;
  createdAt: string;
  expiresAt: string | null;
  autoDestroyOnRead: boolean;
};

export function DecryptPanel(props: DecryptPanelProps) {
  const {
    hashId,
    ciphertext,
    iv,
    salt,
    createdAt,
    expiresAt,
    autoDestroyOnRead,
  } = props;

  const [seed, setSeed] = useState("");
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string>(
    `https://h4sh.org/hash/${hashId}`
  );
  const [copied, setCopied] = useState(false);
  const [hasConsumed, setHasConsumed] = useState(false);
  const [autoDestroyFeedback, setAutoDestroyFeedback] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/hash/${hashId}`);
    }
  }, [hashId]);

  const formattedDate = useMemo(() => {
    try {
      return new Date(createdAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return createdAt;
    }
  }, [createdAt]);
  const formattedExpiry = useMemo(() => {
    if (!expiresAt) {
      return "No expiry configured";
    }
    try {
      return new Date(expiresAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return expiresAt;
    }
  }, [expiresAt]);

  async function handleDecrypt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setDecrypted(null);
    setAutoDestroyFeedback(null);

    if (!seed) {
      setError("Enter the seed phrase to decrypt.");
      return;
    }

    if (!isCryptoAvailable()) {
      setError(
        "Decryption is not supported in this browser. Try a different one."
      );
      return;
    }

    setIsDecrypting(true);

    try {
      const plaintext = await decryptMessage(ciphertext, seed, salt, iv);
      setDecrypted(plaintext);

      if (autoDestroyOnRead && !hasConsumed) {
        try {
          const response = await fetch(`/api/hash/${hashId}/consume`, {
            method: "POST",
          });

          if (!response.ok) {
            throw new Error("Failed to trigger self-destruction.");
          }

          const result: { deleted?: boolean } = await response.json();

          if (result.deleted) {
            setHasConsumed(true);
            setAutoDestroyFeedback(
              "The encrypted payload has been deleted after this decryption."
            );
          } else {
            setAutoDestroyFeedback(
              "Self-destruction did not run. The message will stay until it expires."
            );
          }
        } catch (consumeError) {
          console.error(consumeError);
          setAutoDestroyFeedback(
            "We could not delete the encrypted payload automatically. It may remain available until expiry."
          );
        }
      }
    } catch {
      setError(
        "Unable to decrypt with that seed phrase. Double-check and try again."
      );
    } finally {
      setIsDecrypting(false);
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (copyError) {
      console.error(copyError);
      setError("Unable to copy link automatically. Copy it manually instead.");
    }
  }

  return (
    <div className="grid gap-10 rounded-3xl border border-white/10 bg-black/30 p-8 backdrop-blur">
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-cyan-300/80">
          Published hash
        </p>
        <h1 className="text-3xl font-semibold text-slate-50">
          {hashId.slice(0, 4)}·{hashId.slice(4)}
        </h1>
        <div className="grid gap-2 rounded-3xl border border-white/10 bg-black/40 p-4 text-sm text-slate-300">
          <div className="flex items-center justify-between">
            <span>Created</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Expires</span>
            <span>{formattedExpiry}</span>
          </div>
          {autoDestroyOnRead && (
            <div className="flex items-center justify-between text-emerald-200">
              <span>One-time reveal</span>
              <span>Enabled</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-medium text-slate-400">
          Share link
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <code className="flex-1 truncate rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-slate-200/90">
            {shareUrl}
          </code>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200 transition hover:border-cyan-300 hover:text-cyan-100"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <form onSubmit={handleDecrypt} className="space-y-6">
        <div className="space-y-3">
          <label
            htmlFor="seed"
            className="text-xs uppercase tracking-[0.35em] text-slate-400"
          >
            Seed phrase
          </label>
          <input
            id="seed"
            name="seed"
            type="text"
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            placeholder="Enter the original seed phrase"
            className="w-full rounded-3xl border border-white/20 bg-black/40 px-6 py-4 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/40"
          />
        </div>

        {error && (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100/90">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isDecrypting || !seed}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-400/90 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-950 transition enabled:hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600/40 disabled:text-slate-400"
        >
          {isDecrypting ? "Decrypting..." : "Decrypt"}
        </button>
      </form>

      {decrypted && (
        <div className="space-y-3 rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-6">
          <p className="text-xs font-semibold text-emerald-300/80">
            Decrypted message
          </p>
          <p className="whitespace-pre-wrap break-words text-sm text-emerald-50">
            {decrypted}
          </p>
        </div>
      )}

      {autoDestroyFeedback && (
        <p className="rounded-3xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100/90">
          {autoDestroyFeedback}
        </p>
      )}
    </div>
  );
}

