import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import {
  generateRoundRobin,
  generateSingleElimination,
  generateGroupStage,
} from "@/lib/tournament";

// GET /api/tournaments
export async function GET() {
  try {
    const tournaments = await prisma.tournament.findMany({
      include: {
        participants: { include: { player: true } },
        matches: { select: { id: true } },
      },
      orderBy: { date: "desc" },
    });

    const result = tournaments.map((t) => ({
      ...t,
      matchCount: t.matches.length,
      matches: undefined,
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/tournaments error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST /api/tournaments - Create tournament + generate matches
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, format, type, playerIds, teams, numGroups } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Cần nhập tên giải" }, { status: 400 });
  }
  if (!["round_robin", "single_elim", "group_knockout"].includes(format)) {
    return NextResponse.json({ error: "Thể thức không hợp lệ" }, { status: 400 });
  }

  const isDoubles = type === "doubles";

  // For doubles: teams = [["id1","id2"], ["id3","id4"], ...]
  // For singles: playerIds = ["id1", "id2", ...]
  let slotIds: string[]; // IDs used in bracket slots
  let allPlayerIds: string[]; // All individual player IDs

  if (isDoubles) {
    if (!teams?.length || teams.length < 2) {
      return NextResponse.json({ error: "Cần ít nhất 2 đội" }, { status: 400 });
    }
    // Each team is [playerId, playerId] - join with comma for slot ID
    slotIds = teams.map((t: string[]) => t.join(","));
    allPlayerIds = teams.flat();
  } else {
    if (!playerIds?.length || playerIds.length < 2) {
      return NextResponse.json({ error: "Cần ít nhất 2 người chơi" }, { status: 400 });
    }
    slotIds = playerIds;
    allPlayerIds = playerIds;
  }

  // Generate matches based on format
  let generatedMatches;
  let groupAssignments: Record<string, string[]> | undefined;

  if (format === "round_robin") {
    generatedMatches = generateRoundRobin(slotIds);
  } else if (format === "single_elim") {
    generatedMatches = generateSingleElimination(slotIds);
  } else {
    const groups = numGroups || Math.max(2, Math.floor(slotIds.length / 4));
    const result = generateGroupStage(slotIds, groups);
    generatedMatches = result.matches;
    groupAssignments = result.groups;
  }

  // Create tournament in transaction
  const tournament = await prisma.$transaction(async (tx) => {
    const t = await tx.tournament.create({
      data: {
        name: name.trim(),
        format,
        type: type ?? "singles",
        status: "in_progress",
        participants: {
          create: allPlayerIds.map((pid: string, i: number) => ({
            playerId: pid,
            seed: i + 1,
            groupName: groupAssignments
              ? Object.entries(groupAssignments).find(([, ids]) =>
                  ids.some((sid) => sid.includes(pid))
                )?.[0]
              : undefined,
          })),
        },
      },
    });

    const tempToDb: Record<string, string> = {};
    const createdMatches = [];

    for (const m of generatedMatches) {
      const created = await tx.tournamentMatch.create({
        data: {
          tournamentId: t.id,
          round: m.round,
          position: m.position,
          groupName: m.groupName,
          slot1: m.slot1,
          slot2: m.slot2,
          winnerId: m.winnerId,
          status: m.status,
        },
      });
      tempToDb[`R${m.round}P${m.position}`] = created.id;
      createdMatches.push({ ...m, dbId: created.id });
    }

    for (const m of createdMatches) {
      if (m.nextMatchId && tempToDb[m.nextMatchId]) {
        await tx.tournamentMatch.update({
          where: { id: m.dbId },
          data: {
            nextMatchId: tempToDb[m.nextMatchId],
            nextSlot: m.nextSlot,
          },
        });
      }
    }

    return t;
  });

  const full = await prisma.tournament.findUnique({
    where: { id: tournament.id },
    include: {
      participants: { include: { player: true } },
      matches: true,
    },
  });

  return NextResponse.json(full, { status: 201 });
}
