"use client";

import { useState } from "react";

interface Player {
  id: string;
  name: string;
  elo: number;
  isGuest?: boolean;
  avatarUrl?: string | null;
}

interface PlayerPickerProps {
  players: Player[];
  selected: Set<string>;
  onToggle: (id: string) => void;
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

export function PlayerPicker({ players, selected, onToggle }: PlayerPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? players.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    : players;

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Tìm người chơi..."
        className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex flex-wrap gap-1.5">
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => onToggle(p.id)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs border transition-colors ${
              selected.has(p.id)
                ? "bg-blue-50 border-blue-300 text-blue-800"
                : "bg-white border-gray-200 text-gray-700 active:bg-gray-100"
            }`}
          >
            {p.avatarUrl ? (
              <img src={p.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <span className={`w-5 h-5 rounded-full ${avatarColor(p.name)} flex items-center justify-center text-white text-[8px] font-bold`}>
                {getInitials(p.name)}
              </span>
            )}
            {p.name}
            <span className="text-[10px] text-gray-400">{Math.round(p.elo)}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-gray-400 py-2">Không tìm thấy.</p>
        )}
      </div>
    </div>
  );
}
