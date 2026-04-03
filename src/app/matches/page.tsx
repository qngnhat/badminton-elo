"use client";

import { useEffect, useState } from "react";

interface MatchPlayer {
  team: number;
  oldElo: number;
  newElo: number;
  player: { id: string; name: string };
}

interface Match {
  id: string;
  date: string;
  type: string;
  score1: number;
  score2: number;
  winner: number;
  isRanked: boolean;
  players: MatchPlayer[];
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/matches?limit=50")
      .then((r) => r.json())
      .then((data) => {
        setMatches(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-gray-500 text-center py-8">Đang tải...</p>;

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-3">Lịch sử thi đấu</h1>

      {matches.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Chưa có trận đấu nào.</p>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => {
            const team1 = m.players.filter((p) => p.team === 1);
            const team2 = m.players.filter((p) => p.team === 2);
            return (
              <div key={m.id} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
                <span className="text-[10px] sm:text-xs text-gray-400 block mb-1.5">
                  {new Date(m.date).toLocaleDateString("vi-VN")} &middot; {m.type === "singles" ? "Đơn" : "Đôi"}
                  {!m.isRanked && " (giao hữu)"}
                </span>
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className={`flex-1 text-right text-xs sm:text-sm ${m.winner === 1 ? "font-semibold" : "text-gray-500"}`}>
                    {team1.map((p) => (
                      <div key={p.player.id} className="leading-5">
                        {p.player.name}
                        <span className={`ml-1 text-[10px] sm:text-xs font-mono ${p.newElo - p.oldElo >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {p.newElo - p.oldElo >= 0 ? "+" : ""}{Math.round((p.newElo - p.oldElo) * 10) / 10}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="text-center font-mono text-base sm:text-lg font-bold min-w-[50px] shrink-0">
                    {m.score1} - {m.score2}
                  </div>
                  <div className={`flex-1 text-xs sm:text-sm ${m.winner === 2 ? "font-semibold" : "text-gray-500"}`}>
                    {team2.map((p) => (
                      <div key={p.player.id} className="leading-5">
                        {p.player.name}
                        <span className={`ml-1 text-[10px] sm:text-xs font-mono ${p.newElo - p.oldElo >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {p.newElo - p.oldElo >= 0 ? "+" : ""}{Math.round((p.newElo - p.oldElo) * 10) / 10}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
