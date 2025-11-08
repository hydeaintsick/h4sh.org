import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ hashId: string }> }
) {
  const { hashId: rawHashId } = await context.params;
  const hashId = rawHashId?.trim();

  if (!hashId) {
    return NextResponse.json({ error: "hashId required" }, { status: 400 });
  }

  try {
    const record = await prisma.hashMessage.findUnique({
      where: { hashId },
      select: {
        ciphertext: true,
        iv: true,
        salt: true,
        createdAt: true,
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(record, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error(`Error fetching hash ${hashId}`, error);
    return NextResponse.json(
      { error: "Failed to fetch encrypted message" },
      { status: 500 }
    );
  }
}

