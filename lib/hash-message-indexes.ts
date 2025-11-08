import type { Prisma } from "@prisma/client";

import { prisma } from "./prisma";

let ttlIndexPromise: Promise<void> | null = null;

export async function ensureHashMessageTTLIndex() {
  if (!ttlIndexPromise) {
    ttlIndexPromise = prisma
      .$runCommandRaw({
        createIndexes: "HashMessage",
        indexes: [
          {
            key: { expiresAt: 1 },
            name: "hashmessage_expiresAt_ttl",
            expireAfterSeconds: 0,
          },
        ],
      } satisfies Prisma.InputJsonObject)
      .then(() => undefined)
      .catch((error: unknown) => {
        if (isIndexAlreadyExistsError(error)) {
          return;
        }
        ttlIndexPromise = null;
        console.error("Failed to ensure TTL index on HashMessage", error);
        throw error;
      });
  }

  return ttlIndexPromise;
}

function isIndexAlreadyExistsError(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "codeName" in error &&
    (error as { codeName?: string }).codeName === "IndexOptionsConflict"
  ) {
    return true;
  }

  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: number }).code === 85
  ) {
    return true;
  }

  return false;
}

