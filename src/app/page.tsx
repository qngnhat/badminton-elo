"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Player {
  id: string;
  name: string;
  elo: number;
  matchesPlayed: number;
  lastPlayedAt: string | null;
  status: string;
  isGuest: boolean;
  note: string | null;
}

function getTier(elo: number) {
  if (elo >= 1200) return { label: "S", color: "bg-yellow-100 text-yellow-800" };
  if (elo >= 1100) return { label: "A", color: "bg-blue-100 text-blue-800" };
  if (elo >= 1000) return { label: "B", color: "bg-green-100 text-green-800" };
  return { label: "C", color: "bg-gray-100 text-gray-800" };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();
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

export default function Leaderboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "members">("active");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = filter === "all" ? "" : "?status=active";
    fetch(`/api/players${params}`)
      .then((r) => r.json())
      .then((data) => {
        let filtered = data;
        if (filter === "members") {
          filtered = data.filter((p: Player) => !p.isGuest);
        }
        setPlayers(filtered);
        setLoading(false);
      });
  }, [filter]);

  const filterLabels = { active: "Đang chơi", members: "Thành viên", all: "Tất cả" };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl sm:text-2xl font-bold">Xếp hạng</h1>
        <div className="flex gap-1 text-xs sm:text-sm">
          {(["active", "members", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-full ${
                filter === f
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">Đang tải...</p>
      ) : players.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          Chưa có người chơi.{" "}
          <Link href="/players" className="text-blue-600 underline">
            Thêm ngay!
          </Link>
        </p>
      ) : (
        <div className="space-y-1.5">
          {players.map((player, i) => {
            const tier = getTier(player.elo);
            return (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="flex items-center gap-2.5 bg-white rounded-lg border border-gray-200 px-3 py-2.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                {/* Rank */}
                <span className="text-gray-400 font-mono text-sm w-5 shrink-0 text-center">
                  {i + 1}
                </span>

                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full ${avatarColor(player.name)} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {getInitials(player.name)}
                </div>

                {/* Name + note */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm truncate">{player.name}</span>
                    <span className={`px-1.5 py-0 rounded text-[10px] font-bold shrink-0 ${tier.color}`}>
                      {tier.label}
                    </span>
                    {player.isGuest && (
                      <span className="text-[10px] text-gray-400 shrink-0">vãng lai</span>
                    )}
                  </div>
                  <div className="flex gap-1.5 mt-0.5">
                    {player.note && (
                      <span className="text-[10px] text-gray-400 truncate">{player.note}</span>
                    )}
                    {!player.note && (
                      <span className="text-[10px] text-gray-400">{player.matchesPlayed} trận</span>
                    )}
                  </div>
                </div>

                {/* Elo */}
                <span className="font-mono font-semibold text-sm tabular-nums shrink-0">
                  {Math.round(player.elo)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
