"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface TournamentMatch {
  id: string;
  round: number;
  position: number;
  groupName: string | null;
  slot1: string | null;
  slot2: string | null;
  winnerId: string | null;
  status: string;
  nextMatchId: string | null;
}

interface Tournament {
  id: string;
  name: string;
  date: string;
  format: string;
  type: string;
  status: string;
  participants: {
    playerId: string;
    seed: number | null;
    groupName: string | null;
    player: { name: string; elo: number };
  }[];
  matches: TournamentMatch[];
  playerMap: Record<string, string>;
}

const formatLabels: Record<string, string> = {
  round_robin: "Vòng tròn",
  single_elim: "Loại trực tiếp",
  group_knockout: "Bảng đấu + Loại",
};

export default function TournamentDetailPage() {
  const params = useParams();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [activeMatch, setActiveMatch] = useState<string | null>(null);
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const deleteTournament = async () => {
    if (!confirm("Xóa giải đấu này? Hành động không thể hoàn tác.")) return;
    await fetch(`/api/tournaments/${params.id}`, { method: "DELETE" });
    router.push("/tournaments");
  };

  const fetchTournament = useCallback(() => {
    fetch(`/api/tournaments/${params.id}`)
      .then((r) => r.json())
      .then(setTournament);
  }, [params.id]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  const submitResult = async (matchId: string) => {
    const s1 = parseInt(score1);
    const s2 = parseInt(score2);
    if (isNaN(s1) || isNaN(s2) || s1 === s2) return;

    setSubmitting(true);
    const res = await fetch(
      `/api/tournaments/${params.id}/matches/${matchId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score1: s1, score2: s2 }),
      }
    );

    setSubmitting(false);
    if (res.ok) {
      setActiveMatch(null);
      setScore1("");
      setScore2("");
      fetchTournament();
    }
  };

  if (!tournament) {
    return <p className="text-gray-500 text-center py-8">Đang tải...</p>;
  }

  // Resolve slot to display name (handles doubles "id1,id2" slots)
  const slotName = (slot: string | null) => {
    if (!slot) return "Chờ";
    if (slot === "BYE") return "BYE";
    const ids = slot.split(",");
    return ids.map((id) => tournament.playerMap[id] ?? "?").join(" & ");
  };

  const isElim = tournament.format === "single_elim";
  const isRR = tournament.format === "round_robin";
  const isGroup = tournament.format === "group_knockout";

  const rounds = new Map<number, TournamentMatch[]>();
  tournament.matches.forEach((m) => {
    if (!rounds.has(m.round)) rounds.set(m.round, []);
    rounds.get(m.round)!.push(m);
  });

  const standings = (isRR || isGroup) ? computeStandings(tournament, slotName) : [];

  return (
    <div>
      <Link
        href="/tournaments"
        className="text-sm text-gray-500 active:text-gray-700 mb-3 inline-block"
      >
        &larr; Giải đấu
      </Link>

      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-xl font-bold">{tournament.name}</h1>
          <p className="text-xs text-gray-500">
            {new Date(tournament.date).toLocaleDateString("vi-VN")} &middot;{" "}
            {formatLabels[tournament.format]} &middot;{" "}
            {tournament.type === "singles" ? "Đơn" : "Đôi"} &middot;{" "}
            {tournament.participants.length} người
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-medium ${
              tournament.status === "completed"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {tournament.status === "completed" ? "Kết thúc" : "Đang diễn ra"}
          </span>
          <button
            onClick={deleteTournament}
            className="text-[10px] px-2 py-0.5 rounded border border-red-200 text-red-500 active:bg-red-50"
          >
            Xóa
          </button>
        </div>
      </div>

      {/* Standings */}
      {standings.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-3">
          <h2 className="font-semibold text-sm mb-2">Bảng xếp hạng</h2>
          {isGroup
            ? Object.entries(groupBy(standings, "group")).map(([group, rows]) => (
                <div key={group} className="mb-3 last:mb-0">
                  <p className="text-xs text-gray-500 font-semibold mb-1">Bảng {group}</p>
                  <StandingsTable rows={rows} />
                </div>
              ))
            : <StandingsTable rows={standings} />
          }
        </div>
      )}

      {/* Matches */}
      <div className="space-y-3">
        {Array.from(rounds.entries()).map(([round, matches]) => (
          <div key={round}>
            <h3 className="text-xs font-semibold text-gray-500 mb-1.5">
              {isElim ? elimRoundName(round, rounds.size) : `Vòng ${round}`}
              {matches[0]?.groupName && ` — Bảng ${matches[0].groupName}`}
            </h3>
            <div className="space-y-1.5">
              {matches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  slotName={slotName}
                  activeMatch={activeMatch}
                  setActiveMatch={setActiveMatch}
                  score1={score1}
                  score2={score2}
                  setScore1={setScore1}
                  setScore2={setScore2}
                  submitResult={submitResult}
                  submitting={submitting}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────

function elimRoundName(round: number, total: number) {
  const r = total - round;
  if (r === 0) return "Chung kết";
  if (r === 1) return "Bán kết";
  if (r === 2) return "Tứ kết";
  return `Vòng ${round}`;
}

interface StandingRow {
  name: string;
  slotId: string;
  group?: string;
  wins: number;
  losses: number;
}

function computeStandings(t: Tournament, slotName: (s: string | null) => string): StandingRow[] {
  // Collect unique slot IDs from matches
  const slotSet = new Set<string>();
  t.matches.forEach((m) => {
    if (m.slot1 && m.slot1 !== "BYE") slotSet.add(m.slot1);
    if (m.slot2 && m.slot2 !== "BYE") slotSet.add(m.slot2);
  });

  const map = new Map<string, StandingRow>();
  slotSet.forEach((sid) => {
    // Find group from first match containing this slot
    const matchWithSlot = t.matches.find((m) => m.slot1 === sid || m.slot2 === sid);
    map.set(sid, {
      slotId: sid,
      name: slotName(sid),
      group: matchWithSlot?.groupName ?? undefined,
      wins: 0,
      losses: 0,
    });
  });

  t.matches
    .filter((m) => m.status === "completed" && m.winnerId)
    .forEach((m) => {
      const loserId = m.winnerId === m.slot1 ? m.slot2 : m.slot1;
      if (m.winnerId && map.has(m.winnerId)) map.get(m.winnerId)!.wins++;
      if (loserId && map.has(loserId)) map.get(loserId)!.losses++;
    });

  return Array.from(map.values()).sort((a, b) => b.wins - a.wins || a.losses - b.losses);
}

function groupBy(rows: StandingRow[], key: "group"): Record<string, StandingRow[]> {
  const groups: Record<string, StandingRow[]> = {};
  rows.forEach((r) => {
    const g = r[key] ?? "A";
    if (!groups[g]) groups[g] = [];
    groups[g].push(r);
  });
  return groups;
}

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="text-xs">
      <div className="grid grid-cols-[1.5rem_1fr_2.5rem_2.5rem] gap-1 text-gray-400 mb-1">
        <span>#</span>
        <span>Tên</span>
        <span className="text-center">T</span>
        <span className="text-center">B</span>
      </div>
      {rows.map((r, i) => (
        <div
          key={r.slotId}
          className="grid grid-cols-[1.5rem_1fr_2.5rem_2.5rem] gap-1 py-1 border-t border-gray-50"
        >
          <span className="text-gray-400">{i + 1}</span>
          <span className="font-medium truncate">{r.name}</span>
          <span className="text-center text-green-600 font-mono">{r.wins}</span>
          <span className="text-center text-red-500 font-mono">{r.losses}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Match card ─────────────────────────────────────────

function MatchCard({
  match: m,
  slotName,
  activeMatch,
  setActiveMatch,
  score1,
  score2,
  setScore1,
  setScore2,
  submitResult,
  submitting,
}: {
  match: TournamentMatch;
  slotName: (s: string | null) => string;
  activeMatch: string | null;
  setActiveMatch: (id: string | null) => void;
  score1: string;
  score2: string;
  setScore1: (v: string) => void;
  setScore2: (v: string) => void;
  submitResult: (matchId: string) => void;
  submitting: boolean;
}) {
  const isReady = m.status === "ready";
  const isDone = m.status === "completed";
  const isActive = activeMatch === m.id;

  return (
    <div
      className={`bg-white rounded-lg border p-2.5 text-sm ${
        isDone ? "border-green-200" : isReady ? "border-blue-200" : "border-gray-200 opacity-60"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`flex-1 text-right text-xs truncate ${
            isDone && m.winnerId === m.slot1 ? "font-semibold text-green-700"
            : isDone ? "text-gray-400" : ""
          }`}
        >
          {slotName(m.slot1)}
        </div>
        <div className="text-center min-w-[40px] shrink-0">
          {isDone ? (
            <span className="text-[10px] text-green-600">xong</span>
          ) : isReady ? (
            <button
              onClick={() => setActiveMatch(isActive ? null : m.id)}
              className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded font-medium active:bg-blue-100"
            >
              {isActive ? "huỷ" : "đấu"}
            </button>
          ) : (
            <span className="text-[10px] text-gray-300">vs</span>
          )}
        </div>
        <div
          className={`flex-1 text-xs truncate ${
            isDone && m.winnerId === m.slot2 ? "font-semibold text-green-700"
            : isDone ? "text-gray-400" : ""
          }`}
        >
          {slotName(m.slot2)}
        </div>
      </div>

      {isActive && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
          <input
            type="number"
            inputMode="numeric"
            value={score1}
            onChange={(e) => setScore1(e.target.value)}
            placeholder="0"
            className="w-14 px-2 py-1.5 border border-gray-300 rounded text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-300">:</span>
          <input
            type="number"
            inputMode="numeric"
            value={score2}
            onChange={(e) => setScore2(e.target.value)}
            placeholder="0"
            className="w-14 px-2 py-1.5 border border-gray-300 rounded text-center font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => submitResult(m.id)}
            disabled={submitting}
            className="flex-1 py-1.5 bg-green-600 text-white rounded text-xs font-medium active:bg-green-700 disabled:opacity-40"
          >
            {submitting ? "..." : "Lưu"}
          </button>
        </div>
      )}
    </div>
  );
}
