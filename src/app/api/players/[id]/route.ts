import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/players/:id - Get player with match history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      matchPlayers: {
        include: { match: { include: { players: { include: { player: true } } } } },
        orderBy: { match: { date: "desc" } },
        take: 20,
      },
    },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  return NextResponse.json(player);
}

// PATCH /api/players/:id - Update player
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, elo, status, isGuest, note } = body;

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name.trim();
  if (elo !== undefined) data.elo = elo;
  if (status !== undefined) data.status = status;
  if (isGuest !== undefined) data.isGuest = isGuest;
  if (note !== undefined) data.note = note?.trim() || null;
  if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl || null;

  const player = await prisma.player.update({
    where: { id },
    data,
  });

  return NextResponse.json(player);
}

// DELETE /api/players/:id - Delete player
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.player.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
