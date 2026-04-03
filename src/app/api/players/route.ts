import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/players - List all players
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status"); // active | inactive | all
  const where = status && status !== "all" ? { status } : {};

  const players = await prisma.player.findMany({
    where,
    orderBy: { elo: "desc" },
  });

  return NextResponse.json(players);
}

// POST /api/players - Create a new player
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, elo, isGuest, note } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Cần nhập tên" }, { status: 400 });
  }

  const player = await prisma.player.create({
    data: {
      name: name.trim(),
      elo: elo ?? 1000,
      isGuest: isGuest ?? false,
      note: note?.trim() || null,
    },
  });

  return NextResponse.json(player, { status: 201 });
}
