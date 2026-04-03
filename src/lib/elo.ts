export interface PlayerElo {
  id: string;
  elo: number;
  matchesPlayed: number;
  isGuest: boolean;
  lastPlayedAt: Date | null;
}

interface EloResult {
  playerId: string;
  oldElo: number;
  newElo: number;
}

// Calculate expected score
function expected(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

// Determine K-factor based on player status
function getKFactor(
  player: PlayerElo,
  matchHasGuest: boolean
): number {
  // Guest: high K
  if (player.isGuest) return 50;

  // Member in match with guest: low K to protect rank
  if (matchHasGuest) return 10;

  // Inactive player (>21 days since last match): high K temporarily
  if (player.lastPlayedAt) {
    const daysSinceLastMatch =
      (Date.now() - player.lastPlayedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastMatch > 21) return 40;
  }

  // New player (<20 matches): high K
  if (player.matchesPlayed < 20) return 40;

  // Normal player
  return 25;
}

// Score margin multiplier: winning by more = more Elo change
function marginMultiplier(winnerScore: number, loserScore: number): number {
  const margin = winnerScore - loserScore;
  return 1 + margin / 21;
}

// Calculate Elo changes for a singles match (1v1)
export function calculateSingles(
  player1: PlayerElo,
  player2: PlayerElo,
  winner: 1 | 2,
  score1: number,
  score2: number
): EloResult[] {
  const e1 = expected(player1.elo, player2.elo);
  const e2 = expected(player2.elo, player1.elo);

  const s1 = winner === 1 ? 1 : 0;
  const s2 = winner === 2 ? 1 : 0;

  const winnerScore = winner === 1 ? score1 : score2;
  const loserScore = winner === 1 ? score2 : score1;
  const multiplier = marginMultiplier(winnerScore, loserScore);

  const hasGuest = player1.isGuest || player2.isGuest;

  const k1 = getKFactor(player1, hasGuest);
  const k2 = getKFactor(player2, hasGuest);

  return [
    {
      playerId: player1.id,
      oldElo: player1.elo,
      newElo: Math.round((player1.elo + k1 * (s1 - e1) * multiplier) * 10) / 10,
    },
    {
      playerId: player2.id,
      oldElo: player2.elo,
      newElo: Math.round((player2.elo + k2 * (s2 - e2) * multiplier) * 10) / 10,
    },
  ];
}

// Calculate Elo changes for a doubles match (2v2)
export function calculateDoubles(
  team1: [PlayerElo, PlayerElo],
  team2: [PlayerElo, PlayerElo],
  winner: 1 | 2,
  score1: number,
  score2: number
): EloResult[] {
  // Team Elo = average of 2 players
  const team1Elo = (team1[0].elo + team1[1].elo) / 2;
  const team2Elo = (team2[0].elo + team2[1].elo) / 2;

  const e1 = expected(team1Elo, team2Elo);
  const e2 = expected(team2Elo, team1Elo);

  const s1 = winner === 1 ? 1 : 0;
  const s2 = winner === 2 ? 1 : 0;

  const winnerScore = winner === 1 ? score1 : score2;
  const loserScore = winner === 1 ? score2 : score1;
  const multiplier = marginMultiplier(winnerScore, loserScore);

  const allPlayers = [...team1, ...team2];
  const hasGuest = allPlayers.some((p) => p.isGuest);

  const results: EloResult[] = [];

  // Update each player individually using team expected score
  for (const player of team1) {
    const k = getKFactor(player, hasGuest);
    results.push({
      playerId: player.id,
      oldElo: player.elo,
      newElo: Math.round((player.elo + k * (s1 - e1) * multiplier) * 10) / 10,
    });
  }

  for (const player of team2) {
    const k = getKFactor(player, hasGuest);
    results.push({
      playerId: player.id,
      oldElo: player.elo,
      newElo: Math.round((player.elo + k * (s2 - e2) * multiplier) * 10) / 10,
    });
  }

  return results;
}
