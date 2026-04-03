// ─── Types ─────────────────────────────────────────────

export interface TMatch {
  round: number;
  position: number;
  groupName?: string;
  slot1: string | null; // playerId or "BYE"
  slot2: string | null;
  status: "pending" | "ready" | "completed";
  nextMatchId?: string; // we'll use temp IDs then remap
  nextSlot?: number;
  winnerId?: string;
}

// ─── Round Robin ───────────────────────────────────────
// Circle method: fix player[0], rotate the rest.
// Each rotation = 1 round with n/2 matches.

export function generateRoundRobin(playerIds: string[]): TMatch[] {
  const ids = [...playerIds];
  const hasBye = ids.length % 2 !== 0;
  if (hasBye) ids.push("BYE");

  const n = ids.length;
  const rounds = n - 1;
  const halfSize = n / 2;
  const matches: TMatch[] = [];

  // Create rotation array (fix index 0)
  const rotating = ids.slice(1);

  for (let round = 0; round < rounds; round++) {
    const current = [ids[0], ...rotating];
    for (let i = 0; i < halfSize; i++) {
      const p1 = current[i];
      const p2 = current[n - 1 - i];

      if (p1 === "BYE" || p2 === "BYE") continue;

      matches.push({
        round: round + 1,
        position: i + 1,
        slot1: p1,
        slot2: p2,
        status: round === 0 ? "ready" : "pending",
      });
    }
    // Rotate: move last to front
    rotating.unshift(rotating.pop()!);
  }

  return matches;
}

// ─── Single Elimination ─────────────────────────────────
// Seeds into bracket, BYE for non-power-of-2, auto-advance BYEs.

export function generateSingleElimination(playerIds: string[]): TMatch[] {
  const n = playerIds.length;
  if (n < 2) throw new Error("Need at least 2 players");

  // Next power of 2
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const totalRounds = Math.log2(bracketSize);

  // Seed players + BYEs
  const seeded: (string | null)[] = [];
  for (let i = 0; i < bracketSize; i++) {
    seeded.push(i < n ? playerIds[i] : "BYE");
  }

  // Standard bracket seeding order (1v16, 8v9, 5v12, 4v13, etc.)
  const seedOrder = getBracketOrder(bracketSize);
  const ordered = seedOrder.map((i) => seeded[i]);

  const matches: TMatch[] = [];
  // Use temp IDs: "R{round}P{position}"
  const tempId = (r: number, p: number) => `R${r}P${p}`;

  // Round 1: pair up
  const r1Matches = bracketSize / 2;
  for (let i = 0; i < r1Matches; i++) {
    const p1 = ordered[i * 2];
    const p2 = ordered[i * 2 + 1];
    const isBye = p1 === "BYE" || p2 === "BYE";

    const nextRound = 2;
    const nextPos = Math.floor(i / 2) + 1;
    const nextSlotNum = (i % 2) + 1;

    matches.push({
      round: 1,
      position: i + 1,
      slot1: p1,
      slot2: p2,
      status: isBye ? "completed" : "ready",
      winnerId: isBye ? (p1 === "BYE" ? p2 : p1) ?? undefined : undefined,
      nextMatchId: totalRounds > 1 ? tempId(nextRound, nextPos) : undefined,
      nextSlot: totalRounds > 1 ? nextSlotNum : undefined,
    });
  }

  // Subsequent rounds
  for (let round = 2; round <= totalRounds; round++) {
    const matchCount = bracketSize / Math.pow(2, round);
    for (let i = 0; i < matchCount; i++) {
      const isLast = round === totalRounds;
      const nextPos = Math.floor(i / 2) + 1;
      const nextSlotNum = (i % 2) + 1;

      matches.push({
        round,
        position: i + 1,
        slot1: null,
        slot2: null,
        status: "pending",
        nextMatchId: !isLast ? tempId(round + 1, nextPos) : undefined,
        nextSlot: !isLast ? nextSlotNum : undefined,
      });
    }
  }

  // Propagate BYE winners into next rounds
  propagateByes(matches);

  return matches;
}

// Propagate BYE auto-wins through the bracket
function propagateByes(matches: TMatch[]) {
  const tempId = (r: number, p: number) => `R${r}P${p}`;
  const findMatch = (r: number, p: number) =>
    matches.find((m) => m.round === r && m.position === p);

  let changed = true;
  while (changed) {
    changed = false;
    for (const m of matches) {
      if (m.status !== "completed" || !m.winnerId || !m.nextMatchId) continue;

      // Parse next match
      const match = m.nextMatchId.match(/R(\d+)P(\d+)/);
      if (!match) continue;
      const nextMatch = findMatch(parseInt(match[1]), parseInt(match[2]));
      if (!nextMatch) continue;

      // Fill the slot
      if (m.nextSlot === 1 && !nextMatch.slot1) {
        nextMatch.slot1 = m.winnerId;
        changed = true;
      } else if (m.nextSlot === 2 && !nextMatch.slot2) {
        nextMatch.slot2 = m.winnerId;
        changed = true;
      }

      // If both slots filled in next match
      if (nextMatch.slot1 && nextMatch.slot2) {
        if (nextMatch.slot1 === "BYE" || nextMatch.slot2 === "BYE") {
          nextMatch.winnerId =
            nextMatch.slot1 === "BYE" ? nextMatch.slot2! : nextMatch.slot1!;
          nextMatch.status = "completed";
          changed = true;
        } else if (nextMatch.status === "pending") {
          nextMatch.status = "ready";
          changed = true;
        }
      }
    }
  }
}

// Standard tournament bracket seeding order
function getBracketOrder(size: number): number[] {
  if (size === 1) return [0];
  if (size === 2) return [0, 1];
  const half = getBracketOrder(size / 2);
  const result: number[] = [];
  for (const seed of half) {
    result.push(seed);
    result.push(size - 1 - seed);
  }
  return result;
}

// ─── Group + Knockout ──────────────────────────────────
// Split into groups, round robin within groups.
// Group stage only — knockout bracket created when groups finish.

export function generateGroupStage(
  playerIds: string[],
  numGroups: number
): { groups: Record<string, string[]>; matches: TMatch[] } {
  // Distribute players across groups (snake draft by seed)
  const groupNames = Array.from({ length: numGroups }, (_, i) =>
    String.fromCharCode(65 + i)
  );
  const groups: Record<string, string[]> = {};
  groupNames.forEach((g) => (groups[g] = []));

  playerIds.forEach((id, i) => {
    const round = Math.floor(i / numGroups);
    const groupIdx = round % 2 === 0 ? i % numGroups : numGroups - 1 - (i % numGroups);
    groups[groupNames[groupIdx]].push(id);
  });

  // Generate round robin for each group
  const allMatches: TMatch[] = [];
  for (const [groupName, ids] of Object.entries(groups)) {
    const groupMatches = generateRoundRobin(ids);
    groupMatches.forEach((m) => {
      m.groupName = groupName;
    });
    allMatches.push(...groupMatches);
  }

  return { groups, matches: allMatches };
}

// Generate knockout bracket from group winners
export function generateKnockoutFromGroups(
  advancingPlayerIds: string[]
): TMatch[] {
  return generateSingleElimination(advancingPlayerIds);
}

// ─── Round names ────────────────────────────────────────

export function getRoundName(
  round: number,
  totalRounds: number,
  format: string
): string {
  if (format === "round_robin") return `Round ${round}`;
  if (format === "group_knockout") return `Round ${round}`;

  // Single elimination
  const remaining = totalRounds - round;
  if (remaining === 0) return "Final";
  if (remaining === 1) return "Semi-Final";
  if (remaining === 2) return "Quarter-Final";
  return `Round ${round}`;
}
