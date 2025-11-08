import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const counter = await prisma.messageCounter.findUnique({
    where: { id: "global" },
    select: { totalCreated: true, updatedAt: true },
  });

  return NextResponse.json({
    totalMessagesCreated: counter?.totalCreated ?? 0,
    updatedAt: counter?.updatedAt ?? null,
  });
}

