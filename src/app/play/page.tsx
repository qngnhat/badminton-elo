"use client";

import { useEffect, useState } from "react";
import { PlayerPicker } from "@/app/components/player-picker";

interface Player {
  id: string;
  name: string;
  elo: number;
  isGuest: boolean;
}

interface TeamResult {
  team1: Player[];
  team2: Player[];
  eloDiff: number;
  team1Elo: number;
  team2Elo: number;
}

export default function PlayPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [teams, setTeams] = useState<TeamResult | null>(null);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/players?status=all")
      .then((r) => r.json())
      .then(setPlayers);
  }, []);

  const togglePlayer = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setTeams(null);
    setMessage("");
  };

  const balanceTeams = async () => {
    const ids = Array.from(selected);
    if (ids.length < 2 || ids.length % 2 !== 0) {
      setMessage("Chọn số chẵn người chơi (2, 4, 6, 8...)");
      return;
    }

    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerIds: ids, randomize: true }),
    });

    if (!res.ok) {
      const err = await res.json();
      setMessage(err.error);
      return;
    }

    setTeams(await res.json());
    setMessage("");
  };

  const submitMatch = async () => {
    if (!teams) return;
    const s1 = parseInt(score1);
    const s2 = parseInt(score2);

    if (isNaN(s1) || isNaN(s2) || s1 === s2) {
      setMessage("Nhập điểm hợp lệ (không hoà)");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        team1: teams.team1.map((p) => p.id),
        team2: teams.team2.map((p) => p.id),
        score1: s1,
        score2: s2,
        type: teams.team1.length === 1 ? "singles" : "doubles",
      }),
    });

    setSubmitting(false);

    if (res.ok) {
      setMessage("Đã lưu trận đấu! Elo đã cập nhật.");
      setTeams(null);
      setSelected(new Set());
      setScore1("");
      setScore2("");
      const data = await fetch("/api/players?status=all").then((r) => r.json());
      setPlayers(data);
    } else {
      const err = await res.json();
      setMessage(err.error || "Lỗi khi lưu trận đấu");
    }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-3">Trận mới</h1>

      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 mb-3">
        <h2 className="font-semibold text-sm mb-2">
          1. Chọn người chơi
          <span className="text-gray-400 font-normal ml-2">({selected.size} đã chọn)</span>
        </h2>
        <PlayerPicker players={players} selected={selected} onToggle={togglePlayer} />

        <button
          onClick={balanceTeams}
          disabled={selected.size < 2}
          className="mt-3 w-full sm:w-auto px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium active:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Tự động chia đội
        </button>
      </div>

      {teams && (
        <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 mb-3">
          <h2 className="font-semibold text-sm mb-2">2. Đội hình</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3">
              <p className="text-[10px] sm:text-xs text-blue-600 font-semibold mb-1.5">Đội 1 ({teams.team1Elo})</p>
              {teams.team1.map((p) => (
                <p key={p.id} className="text-xs sm:text-sm">
                  {p.name} <span className="text-gray-400 text-[10px]">{Math.round(p.elo)}</span>
                </p>
              ))}
            </div>
            <div className="bg-red-50 rounded-lg p-2.5 sm:p-3">
              <p className="text-[10px] sm:text-xs text-red-600 font-semibold mb-1.5">Đội 2 ({teams.team2Elo})</p>
              {teams.team2.map((p) => (
                <p key={p.id} className="text-xs sm:text-sm">
                  {p.name} <span className="text-gray-400 text-[10px]">{Math.round(p.elo)}</span>
                </p>
              ))}
            </div>
          </div>
          <p className="text-[10px] sm:text-xs text-gray-400 mt-1.5">Chênh lệch Elo: {teams.eloDiff}</p>

          <h2 className="font-semibold text-sm mt-4 mb-2">3. Tỉ số</h2>
          <div className="flex items-center gap-2">
            <input type="number" inputMode="numeric" value={score1} onChange={(e) => setScore1(e.target.value)}
              placeholder="Đ1" className="w-16 sm:w-20 px-2 py-2.5 border border-gray-300 rounded-lg text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-gray-300 font-bold text-lg">:</span>
            <input type="number" inputMode="numeric" value={score2} onChange={(e) => setScore2(e.target.value)}
              placeholder="Đ2" className="w-16 sm:w-20 px-2 py-2.5 border border-gray-300 rounded-lg text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={submitMatch} disabled={submitting}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium active:bg-green-700 disabled:opacity-40">
              {submitting ? "..." : "Lưu"}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.includes("lưu") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {message}
        </div>
      )}
    </div>
  );
}
