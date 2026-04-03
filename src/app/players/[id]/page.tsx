"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface MatchPlayer {
  team: number;
  oldElo: number;
  newElo: number;
  player: { id: string; name: string };
}

interface MatchDetail {
  match: {
    id: string;
    date: string;
    type: string;
    score1: number;
    score2: number;
    winner: number;
    players: MatchPlayer[];
  };
  team: number;
  oldElo: number;
  newElo: number;
}

interface PlayerDetail {
  id: string;
  name: string;
  elo: number;
  matchesPlayed: number;
  lastPlayedAt: string | null;
  status: string;
  isGuest: boolean;
  note: string | null;
  matchPlayers: MatchDetail[];
}

const avatarColors = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-pink-500",
  "bg-indigo-500", "bg-teal-500", "bg-orange-500", "bg-red-500",
];

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(-2).join("").toUpperCase();
}

export default function PlayerDetailPage() {
  const params = useParams();
  const [player, setPlayer] = useState<PlayerDetail | null>(null);

  useEffect(() => {
    fetch(`/api/players/${params.id}`)
      .then((r) => r.json())
      .then(setPlayer);
  }, [params.id]);

  if (!player) return <p className="text-gray-500 text-center py-8">Đang tải...</p>;

  const recentForm = player.matchPlayers.slice(0, 5).map((mp) => {
    return mp.match.winner === mp.team ? "T" : "B";
  });

  return (
    <div>
      <Link href="/players" className="text-sm text-gray-500 active:text-gray-700 mb-3 inline-block">
        &larr; Quay lại
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-12 h-12 rounded-full ${avatarColor(player.name)} flex items-center justify-center text-white text-lg font-bold shrink-0`}>
            {getInitials(player.name)}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{player.name}</h1>
            <div className="flex gap-2 mt-0.5">
              {player.note && <span className="text-xs text-gray-500">{player.note}</span>}
              {player.isGuest && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0 rounded">Vãng lai</span>}
              <span className={`text-xs px-1.5 py-0 rounded ${
                player.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
              }`}>
                {player.status === "active" ? "Đang chơi" : "Nghỉ"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-[10px] text-gray-500">Elo</p>
            <p className="text-xl font-mono font-bold">{Math.round(player.elo)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Số trận</p>
            <p className="text-xl font-mono font-bold">{player.matchesPlayed}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-500">Phong độ</p>
            <div className="flex gap-1 mt-1">
              {recentForm.length > 0 ? recentForm.map((r, i) => (
                <span key={i} className={`w-6 h-6 rounded text-xs font-bold flex items-center justify-center ${
                  r === "T" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}>{r}</span>
              )) : <span className="text-gray-400 text-sm">—</span>}
            </div>
          </div>
        </div>
      </div>

      <h2 className="font-semibold text-sm mb-2">Lịch sử thi đấu</h2>
      {player.matchPlayers.length === 0 ? (
        <p className="text-gray-500 text-sm">Chưa có trận đấu nào.</p>
      ) : (
        <div className="space-y-1.5">
          {player.matchPlayers.map((mp) => {
            const m = mp.match;
            const won = m.winner === mp.team;
            const eloChange = mp.newElo - mp.oldElo;
            const t1 = m.players.filter((p) => p.team === 1);
            const t2 = m.players.filter((p) => p.team === 2);

            return (
              <div key={m.id} className={`bg-white rounded-lg border p-2.5 text-sm ${won ? "border-green-200" : "border-red-200"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-400 text-[10px]">
                      {new Date(m.date).toLocaleDateString("vi-VN")} &middot; {m.type === "singles" ? "Đơn" : "Đôi"}
                    </span>
                    <div className="mt-0.5 text-xs">
                      <span className={m.winner === 1 ? "font-semibold" : ""}>{t1.map((p) => p.player.name).join(" & ")}</span>
                      <span className="mx-1.5 text-gray-400 font-mono">{m.score1}-{m.score2}</span>
                      <span className={m.winner === 2 ? "font-semibold" : ""}>{t2.map((p) => p.player.name).join(" & ")}</span>
                    </div>
                  </div>
                  <div className={`font-mono font-bold text-sm shrink-0 ml-2 ${eloChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {eloChange >= 0 ? "+" : ""}{Math.round(eloChange * 10) / 10}
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
