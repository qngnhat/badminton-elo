"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Player {
  id: string;
  name: string;
  elo: number;
}

export default function NewTournamentPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [format, setFormat] = useState("round_robin");
  const [type, setType] = useState("singles");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [teams, setTeams] = useState<[string, string][]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/players?status=all")
      .then((r) => r.json())
      .then(setPlayers);
  }, []);

  const isDoubles = type === "doubles";

  const togglePlayer = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === players.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(players.map((p) => p.id)));
    }
  };

  // ─── Doubles team pairing ─────────────────────────

  const pairedPlayerIds = new Set(teams.flat());
  const unpaired = players.filter(
    (p) => selected.has(p.id) && !pairedPlayerIds.has(p.id)
  );

  const [firstPick, setFirstPick] = useState<string | null>(null);

  const pickPlayer = (id: string) => {
    if (!firstPick) {
      setFirstPick(id);
    } else {
      if (id === firstPick) {
        setFirstPick(null);
        return;
      }
      setTeams((prev) => [...prev, [firstPick, id]]);
      setFirstPick(null);
    }
  };

  const removeTeam = (idx: number) => {
    setTeams((prev) => prev.filter((_, i) => i !== idx));
  };

  const autoBalance = () => {
    const available = players
      .filter((p) => selected.has(p.id))
      .sort((a, b) => b.elo - a.elo);

    // Pair strongest with weakest
    const newTeams: [string, string][] = [];
    const arr = [...available];
    while (arr.length >= 2) {
      const strong = arr.shift()!;
      const weak = arr.pop()!;
      newTeams.push([strong.id, weak.id]);
    }
    setTeams(newTeams);
    setFirstPick(null);
  };

  // Reset teams when type or selection changes
  useEffect(() => {
    setTeams([]);
    setFirstPick(null);
  }, [type, selected.size]);

  const pName = (id: string) => players.find((p) => p.id === id)?.name ?? "?";
  const pElo = (id: string) => Math.round(players.find((p) => p.id === id)?.elo ?? 0);

  const canCreate = () => {
    if (!name.trim()) return false;
    if (isDoubles) return teams.length >= 2;
    return selected.size >= 2;
  };

  const create = async () => {
    if (!name.trim()) {
      setError("Nhập tên giải đấu");
      return;
    }
    if (isDoubles && teams.length < 2) {
      setError("Cần ít nhất 2 đội");
      return;
    }
    if (!isDoubles && selected.size < 2) {
      setError("Chọn ít nhất 2 người chơi");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload: Record<string, unknown> = { name: name.trim(), format, type };
    if (isDoubles) {
      payload.teams = teams;
      payload.playerIds = teams.flat(); // for participant creation
    } else {
      payload.playerIds = Array.from(selected);
    }

    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      router.push(`/tournaments/${data.id}`);
    } else {
      const err = await res.json();
      setError(err.error || "Không thể tạo giải");
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-3">Tạo giải đấu</h1>

      <div className="space-y-3">
        {/* Name */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <label className="block text-xs text-gray-500 mb-1">Tên giải</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="vd: Cup Cuối Tuần #5"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Format + Type */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Thể thức</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="round_robin">Vòng tròn</option>
                <option value="single_elim">Loại trực tiếp</option>
                <option value="group_knockout">Bảng đấu + Loại</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Loại</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="singles">Đơn</option>
                <option value="doubles">Đôi</option>
              </select>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            {format === "round_robin" && "Mỗi người/đội đấu với tất cả. Tốt nhất 4-8."}
            {format === "single_elim" && "Thua 1 trận = bị loại. Thể thức nhanh."}
            {format === "group_knockout" && "Chia bảng đấu vòng tròn, top tiến vào loại trực tiếp."}
          </p>
        </div>

        {/* Select Players */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500">
              Người chơi ({selected.size} đã chọn)
            </label>
            <button
              onClick={selectAll}
              className="text-xs text-blue-600 active:text-blue-800"
            >
              {selected.size === players.length ? "Bỏ chọn" : "Chọn tất cả"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {players.map((p) => (
              <button
                key={p.id}
                onClick={() => togglePlayer(p.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                  selected.has(p.id)
                    ? "bg-blue-50 border-blue-300 text-blue-800"
                    : "bg-white border-gray-200 text-gray-600 active:bg-gray-100"
                }`}
              >
                {p.name}
                <span className="ml-1 text-[10px] text-gray-400">
                  {Math.round(p.elo)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Doubles: Team pairing */}
        {isDoubles && selected.size >= 2 && (
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500">
                Ghép đội ({teams.length} đội)
              </label>
              <button
                onClick={autoBalance}
                className="text-xs text-blue-600 active:text-blue-800"
              >
                Tự động ghép
              </button>
            </div>

            {/* Formed teams */}
            {teams.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {teams.map(([a, b], i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2"
                  >
                    <div className="text-xs">
                      <span className="font-medium">{pName(a)}</span>
                      <span className="text-gray-400 text-[10px] ml-1">{pElo(a)}</span>
                      <span className="mx-1.5 text-gray-400">&</span>
                      <span className="font-medium">{pName(b)}</span>
                      <span className="text-gray-400 text-[10px] ml-1">{pElo(b)}</span>
                    </div>
                    <button
                      onClick={() => removeTeam(i)}
                      className="text-red-400 text-[10px] active:text-red-600 ml-2"
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Unpaired players */}
            {unpaired.length > 0 && (
              <div>
                <p className="text-[10px] text-gray-400 mb-1.5">
                  {firstPick
                    ? `Chọn đồng đội cho ${pName(firstPick)}`
                    : "Chọn 2 người để ghép đội"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {unpaired.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => pickPlayer(p.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                        firstPick === p.id
                          ? "bg-yellow-50 border-yellow-400 text-yellow-800"
                          : "bg-white border-gray-200 text-gray-600 active:bg-gray-100"
                      }`}
                    >
                      {p.name}
                      <span className="ml-1 text-[10px] text-gray-400">
                        {Math.round(p.elo)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selected.size % 2 !== 0 && (
              <p className="text-[10px] text-red-500 mt-2">
                Cần chọn số chẵn người chơi để ghép đội đôi.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={create}
          disabled={submitting || !canCreate()}
          className="w-full py-3 bg-gray-900 text-white rounded-lg text-sm font-medium active:bg-gray-700 disabled:opacity-40"
        >
          {submitting ? "Đang tạo..." : "Tạo giải đấu"}
        </button>
      </div>
    </div>
  );
}
