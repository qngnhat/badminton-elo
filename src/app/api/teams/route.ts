import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { autoBalance } from "@/lib/team-balancer";

// POST /api/teams - Auto balance teams from player IDs
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { playerIds, randomize } = body;

  if (!playerIds?.length || playerIds.length < 2 || playerIds.length % 2 !== 0) {
    return NextResponse.json(
      { error: "Need an even number of players (2, 4, 6, 8...)" },
      { status: 400 }
    );
  }

  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
    select: { id: true, name: true, elo: true },
  });

  if (players.length !== playerIds.length) {
    return NextResponse.json({ error: "Some players not found" }, { status: 400 });
  }

  const result = autoBalance(players, { randomize: randomize ?? true });

  return NextResponse.json({
    team1: result.team1,
    team2: result.team2,
    eloDiff: Math.round(result.eloDiff),
    team1Elo: Math.round(result.team1.reduce((s, p) => s + p.elo, 0)),
    team2Elo: Math.round(result.team2.reduce((s, p) => s + p.elo, 0)),
  });
}
