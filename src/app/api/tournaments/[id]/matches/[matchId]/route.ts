import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { calculateSingles, calculateDoubles, PlayerElo } from "@/lib/elo";

// Parse slot: "id1,id2" → ["id1","id2"] or "id1" → ["id1"]
function parseSlot(slot: string): string[] {
  return slot.split(",");
}

// POST /api/tournaments/:id/matches/:matchId - Record result
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const { id: tournamentId, matchId } = await params;
  const { score1, score2 } = await req.json();

  if (score1 === undefined || score2 === undefined || score1 === score2) {
    return NextResponse.json({ error: "Điểm không hợp lệ" }, { status: 400 });
  }

  const tMatch = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
  });

  if (!tMatch || tMatch.tournamentId !== tournamentId) {
    return NextResponse.json({ error: "Không tìm thấy trận" }, { status: 404 });
  }
  if (tMatch.status === "completed") {
    return NextResponse.json({ error: "Trận đã kết thúc" }, { status: 400 });
  }
  if (!tMatch.slot1 || !tMatch.slot2 || tMatch.slot1 === "BYE" || tMatch.slot2 === "BYE") {
    return NextResponse.json({ error: "Trận chưa sẵn sàng" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  const winner: 1 | 2 = score1 > score2 ? 1 : 2;
  const winnerId = winner === 1 ? tMatch.slot1 : tMatch.slot2;
  const isDoubles = tournament?.type === "doubles";

  // Parse slots to get all individual player IDs
  const team1Ids = parseSlot(tMatch.slot1);
  const team2Ids = parseSlot(tMatch.slot2);
  const allIds = [...team1Ids, ...team2Ids];

  const players = await prisma.player.findMany({
    where: { id: { in: allIds } },
  });
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const toPlayerElo = (pid: string): PlayerElo => {
    const p = playerMap.get(pid)!;
    return {
      id: p.id,
      elo: p.elo,
      matchesPlayed: p.matchesPlayed,
      isGuest: p.isGuest,
      lastPlayedAt: p.lastPlayedAt,
    };
  };

  let eloResults;
  if (isDoubles && team1Ids.length === 2 && team2Ids.length === 2) {
    eloResults = calculateDoubles(
      [toPlayerElo(team1Ids[0]), toPlayerElo(team1Ids[1])],
      [toPlayerElo(team2Ids[0]), toPlayerElo(team2Ids[1])],
      winner,
      score1,
      score2
    );
  } else {
    eloResults = calculateSingles(
      toPlayerElo(team1Ids[0]),
      toPlayerElo(team2Ids[0]),
      winner,
      score1,
      score2
    );
  }

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.create({
      data: {
        type: isDoubles ? "doubles" : "singles",
        score1,
        score2,
        winner,
        isRanked: true,
        players: {
          create: eloResults.map((r) => ({
            playerId: r.playerId,
            team: team1Ids.includes(r.playerId) ? 1 : 2,
            oldElo: r.oldElo,
            newElo: r.newElo,
          })),
        },
      },
    });

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

    await tx.tournamentMatch.update({
      where: { id: matchId },
      data: { matchId: match.id, winnerId, status: "completed" },
    });

    if (tMatch.nextMatchId && tMatch.nextSlot) {
      const updateData =
        tMatch.nextSlot === 1 ? { slot1: winnerId } : { slot2: winnerId };

      await tx.tournamentMatch.update({
        where: { id: tMatch.nextMatchId },
        data: updateData,
      });

      const nextMatch = await tx.tournamentMatch.findUnique({
        where: { id: tMatch.nextMatchId },
      });
      if (nextMatch && nextMatch.slot1 && nextMatch.slot2) {
        await tx.tournamentMatch.update({
          where: { id: tMatch.nextMatchId },
          data: { status: "ready" },
        });
      }
    }

    if (tournament?.format === "round_robin" || tournament?.format === "group_knockout") {
      const roundMatches = await tx.tournamentMatch.findMany({
        where: {
          tournamentId,
          round: tMatch.round,
          ...(tMatch.groupName ? { groupName: tMatch.groupName } : {}),
        },
      });

      if (roundMatches.every((m) => m.status === "completed")) {
        await tx.tournamentMatch.updateMany({
          where: {
            tournamentId,
            round: tMatch.round + 1,
            status: "pending",
            ...(tMatch.groupName ? { groupName: tMatch.groupName } : {}),
          },
          data: { status: "ready" },
        });
      }
    }

    const remaining = await tx.tournamentMatch.count({
      where: { tournamentId, status: { not: "completed" } },
    });
    if (remaining === 0) {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: "completed" },
      });
    }
  });

  return NextResponse.json({ ok: true, winnerId });
}
