import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ hashId: string }> }
) {
  const { hashId } = await context.params;

  if (!hashId) {
    return NextResponse.json({ error: "hashId required" }, { status: 400 });
  }

  const record = await prisma.hashMessage.findUnique({
    where: { hashId },
    select: { autoDestroyOnRead: true },
  });

  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!record.autoDestroyOnRead) {
    return NextResponse.json({ deleted: false }, { status: 200 });
  }

  try {
    await prisma.hashMessage.delete({
      where: { hashId },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ deleted: false }, { status: 200 });
    }
    console.error("Failed to delete hash message", error);
    return NextResponse.json(
      { error: "Failed to delete hash message" },
      { status: 500 }
    );
  }

  return NextResponse.json({ deleted: true }, { status: 200 });
}

