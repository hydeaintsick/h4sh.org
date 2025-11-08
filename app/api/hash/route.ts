import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { ensureHashMessageTTLIndex } from "@/lib/hash-message-indexes";

const payloadSchema = z.object({
  ciphertext: z.string().min(1, "ciphertext required"),
  iv: z.string().min(1, "iv required"),
  salt: z.string().min(1, "salt required"),
  autoDestroyOnRead: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      ciphertext,
      iv,
      salt,
      autoDestroyOnRead = false,
      expiresAt,
    } = payloadSchema.parse(body);

    const parsedExpiry =
      expiresAt !== undefined ? new Date(expiresAt) : createDefaultExpiry();

    if (Number.isNaN(parsedExpiry.getTime())) {
      return NextResponse.json(
        { error: "Invalid expiresAt value" },
        { status: 400 }
      );
    }

    await ensureHashMessageTTLIndex();

    const { hashId, createdAt, expiresAt: storedExpiry } =
      await createEncryptedMessage({
      ciphertext,
      iv,
      salt,
      expiresAt: parsedExpiry,
      autoDestroyOnRead,
    });

    await incrementMessageCounter();

    return NextResponse.json(
      { hashId, createdAt, expiresAt: storedExpiry },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", issues: error.flatten() },
        { status: 400 }
      );
    }

    console.error("Error creating hash", error);
    return NextResponse.json(
      { error: "Failed to store encrypted message" },
      { status: 500 }
    );
  }
}

async function createEncryptedMessage(data: {
  ciphertext: string;
  iv: string;
  salt: string;
  expiresAt: Date;
  autoDestroyOnRead: boolean;
}) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const hashId = generateHashId();

    try {
      const record = await prisma.hashMessage.create({
        data: {
          hashId,
          ...data,
        },
        select: {
          hashId: true,
          createdAt: true,
          expiresAt: true,
        },
      });

      return record;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Unable to generate unique hash id");
}

function generateHashId() {
  return randomBytes(9).toString("base64url");
}

function createDefaultExpiry() {
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  return new Date(Date.now() + THIRTY_DAYS_MS);
}

async function incrementMessageCounter() {
  await prisma.messageCounter.upsert({
    where: { id: "global" },
    create: {
      id: "global",
      totalCreated: 1,
    },
    update: {
      totalCreated: {
        increment: 1,
      },
    },
  });
}

