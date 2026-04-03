interface PlayerForBalance {
  id: string;
  name: string;
  elo: number;
}

interface TeamSplit {
  team1: PlayerForBalance[];
  team2: PlayerForBalance[];
  eloDiff: number;
}

// Brute force: try all possible ways to split players into 2 equal teams
// Best for 4-8 players
export function balanceTeams(
  players: PlayerForBalance[],
  options?: { randomize?: boolean }
): TeamSplit {
  const n = players.length;
  if (n < 2 || n % 2 !== 0) {
    throw new Error("Need an even number of players (2, 4, 6, 8...)");
  }

  const halfSize = n / 2;
  const totalElo = players.reduce((sum, p) => sum + p.elo, 0);
  const targetElo = totalElo / 2;

  let bestSplit: TeamSplit | null = null;
  const allSplits: TeamSplit[] = [];

  // Generate all combinations of halfSize players for team 1
  const indices = Array.from({ length: n }, (_, i) => i);

  function* combinations(arr: number[], k: number, start = 0): Generator<number[]> {
    if (k === 0) {
      yield [];
      return;
    }
    for (let i = start; i <= arr.length - k; i++) {
      for (const rest of combinations(arr, k - 1, i + 1)) {
        yield [arr[i], ...rest];
      }
    }
  }

  for (const team1Indices of combinations(indices, halfSize)) {
    const team1 = team1Indices.map((i) => players[i]);
    const team2 = players.filter((_, i) => !team1Indices.includes(i));
    const team1Elo = team1.reduce((sum, p) => sum + p.elo, 0);
    const eloDiff = Math.abs(team1Elo - targetElo);

    const split: TeamSplit = { team1, team2, eloDiff: eloDiff * 2 }; // *2 for actual diff between teams

    if (!bestSplit || eloDiff < Math.abs(bestSplit.eloDiff / 2)) {
      bestSplit = split;
    }

    // Collect near-best splits for randomization
    if (eloDiff <= (bestSplit?.eloDiff ?? Infinity) / 2 + 30) {
      allSplits.push(split);
    }
  }

  // Optional: 80% chance best, 20% near-best (for variety)
  if (options?.randomize && allSplits.length > 1) {
    // Filter to only near-optimal splits
    const threshold = (bestSplit?.eloDiff ?? 0) + 60; // within 60 Elo of best
    const nearBest = allSplits.filter((s) => s.eloDiff <= threshold);

    if (nearBest.length > 1 && Math.random() > 0.8) {
      const idx = Math.floor(Math.random() * nearBest.length);
      return nearBest[idx];
    }
  }

  return bestSplit!;
}

// Snake draft fallback for large groups (>8 players)
export function snakeDraft(players: PlayerForBalance[]): TeamSplit {
  const sorted = [...players].sort((a, b) => b.elo - a.elo);
  const team1: PlayerForBalance[] = [];
  const team2: PlayerForBalance[] = [];

  sorted.forEach((player, i) => {
    const round = Math.floor(i / 2);
    if (round % 2 === 0) {
      // Even round: first pick goes to team with fewer Elo
      if (i % 2 === 0) team1.push(player);
      else team2.push(player);
    } else {
      // Odd round: reverse
      if (i % 2 === 0) team2.push(player);
      else team1.push(player);
    }
  });

  const team1Elo = team1.reduce((sum, p) => sum + p.elo, 0);
  const team2Elo = team2.reduce((sum, p) => sum + p.elo, 0);

  return { team1, team2, eloDiff: Math.abs(team1Elo - team2Elo) };
}

// Auto-select best algorithm based on player count
export function autoBalance(
  players: PlayerForBalance[],
  options?: { randomize?: boolean }
): TeamSplit {
  if (players.length <= 8) {
    return balanceTeams(players, options);
  }
  return snakeDraft(players);
}
