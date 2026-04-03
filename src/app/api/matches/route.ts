import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { calculateSingles, calculateDoubles, PlayerElo } from "@/lib/elo";

// GET /api/matches - List recent matches
export async function GET(req: NextRequest) {
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "20");

  const matches = await prisma.match.findMany({
    include: {
      players: {
        include: { player: true },
      },
    },
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json(matches);
}

// POST /api/matches - Submit a match result and update Elo
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { team1, team2, score1, score2, type, date, isRanked } = body;

  // Validate
  if (!team1?.length || !team2?.length) {
    return NextResponse.json({ error: "Both teams required" }, { status: 400 });
  }
  if (score1 === undefined || score2 === undefined || score1 === score2) {
    return NextResponse.json({ error: "Valid scores required (no draws)" }, { status: 400 });
  }

  const winner: 1 | 2 = score1 > score2 ? 1 : 2;
  const matchType = type ?? (team1.length === 1 && team2.length === 1 ? "singles" : "doubles");
  const ranked = isRanked ?? true;

  // Fetch all players
  const allIds: string[] = [...team1, ...team2];
  const players = await prisma.player.findMany({
    where: { id: { in: allIds } },
  });

  if (players.length !== allIds.length) {
    return NextResponse.json({ error: "Some players not found" }, { status: 400 });
  }

  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Build PlayerElo objects
  const toPlayerElo = (id: string): PlayerElo => {
    const p = playerMap.get(id)!;
    return {
      id: p.id,
      elo: p.elo,
      matchesPlayed: p.matchesPlayed,
      isGuest: p.isGuest,
      lastPlayedAt: p.lastPlayedAt,
    };
  };

  // Calculate Elo changes
  let eloResults;
  if (matchType === "singles") {
    eloResults = calculateSingles(
      toPlayerElo(team1[0]),
      toPlayerElo(team2[0]),
      winner,
      score1,
      score2
    );
  } else {
    eloResults = calculateDoubles(
      [toPlayerElo(team1[0]), toPlayerElo(team1[1])] as [PlayerElo, PlayerElo],
      [toPlayerElo(team2[0]), toPlayerElo(team2[1])] as [PlayerElo, PlayerElo],
      winner,
      score1,
      score2
    );
  }

  // Transaction: create match + update all players
  const match = await prisma.$transaction(async (tx) => {
    const newMatch = await tx.match.create({
      data: {
        type: matchType,
        score1,
        score2,
        winner,
        isRanked: ranked,
        date: date ? new Date(date) : new Date(),
        players: {
          create: eloResults.map((r) => ({
            playerId: r.playerId,
            team: team1.includes(r.playerId) ? 1 : 2,
            oldElo: r.oldElo,
            newElo: ranked ? r.newElo : r.oldElo,
          })),
        },
      },
      include: {
        players: { include: { player: true } },
      },
    });

    // Update player Elo + stats
    if (ranked) {
      for (const r of eloResults) {
        await tx.player.update({
          where: { id: r.playerId },
          data: {
            elo: r.newElo,
            matchesPlayed: { increment: 1 },
            lastPlayedAt: new Date(),
            status: "active",
          },
        });
      }
    }

    return newMatch;
  });

  return NextResponse.json(match, { status: 201 });
}
