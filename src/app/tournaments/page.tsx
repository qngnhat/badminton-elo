"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Tournament {
  id: string;
  name: string;
  date: string;
  format: string;
  type: string;
  status: string;
  participants: { player: { name: string } }[];
  matchCount: number;
}

const formatLabels: Record<string, string> = {
  round_robin: "Vòng tròn",
  single_elim: "Loại trực tiếp",
  group_knockout: "Bảng đấu + Loại",
};

const statusLabels: Record<string, string> = {
  draft: "Nháp",
  in_progress: "Đang diễn ra",
  completed: "Kết thúc",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tournaments")
      .then((r) => r.json())
      .then((data) => {
        setTournaments(data);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl sm:text-2xl font-bold">Giải đấu</h1>
        <Link
          href="/tournaments/new"
          className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium active:bg-gray-700"
        >
          + Tạo giải
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-8">Đang tải...</p>
      ) : tournaments.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Chưa có giải đấu nào.</p>
      ) : (
        <div className="space-y-2">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/tournaments/${t.id}`}
              className="block bg-white rounded-lg border border-gray-200 p-3 active:bg-gray-50"
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-sm">{t.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${statusColors[t.status]}`}>
                  {statusLabels[t.status]}
                </span>
              </div>
              <div className="flex gap-3 text-xs text-gray-500">
                <span>{new Date(t.date).toLocaleDateString("vi-VN")}</span>
                <span>{formatLabels[t.format]}</span>
                <span>{t.type === "singles" ? "Đơn" : "Đôi"}</span>
                <span>{t.participants.length} người</span>
                <span>{t.matchCount} trận</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
