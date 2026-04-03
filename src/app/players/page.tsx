"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface Player {
  id: string;
  name: string;
  elo: number;
  matchesPlayed: number;
  isGuest: boolean;
  status: string;
  note: string | null;
  avatarUrl: string | null;
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

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function Avatar({ player, size = "w-8 h-8", textSize = "text-xs" }: { player: Pick<Player, "name" | "avatarUrl">; size?: string; textSize?: string }) {
  if (player.avatarUrl) {
    return <img src={player.avatarUrl} alt="" className={`${size} rounded-full object-cover shrink-0`} />;
  }
  return (
    <div className={`${size} rounded-full ${avatarColor(player.name)} flex items-center justify-center text-white ${textSize} font-bold shrink-0`}>
      {getInitials(player.name)}
    </div>
  );
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState("");
  const [elo, setElo] = useState("1000");
  const [isGuest, setIsGuest] = useState(false);
  const [note, setNote] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editElo, setEditElo] = useState("");
  const [editIsGuest, setEditIsGuest] = useState(false);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const fetchPlayers = () => {
    fetch("/api/players?status=all")
      .then((r) => r.json())
      .then((data) => { setPlayers(data); setLoading(false); });
  };

  useEffect(() => { fetchPlayers(); }, []);

  const handleAvatarFile = async (file: File, setter: (url: string) => void) => {
    const resized = await resizeImage(file, 128);
    setter(resized);
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        elo: parseFloat(elo),
        isGuest,
        note: note.trim() || undefined,
        avatarUrl: avatarPreview || undefined,
      }),
    });

    setName("");
    setElo("1000");
    setIsGuest(false);
    setNote("");
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fetchPlayers();
  };

  const startEdit = (player: Player) => {
    setEditingId(player.id);
    setEditName(player.name);
    setEditNote(player.note ?? "");
    setEditElo(String(Math.round(player.elo)));
    setEditIsGuest(player.isGuest);
    setEditAvatarPreview(player.avatarUrl);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAvatarPreview(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;

    await fetch(`/api/players/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim(),
        elo: parseFloat(editElo),
        isGuest: editIsGuest,
        note: editNote.trim() || null,
        avatarUrl: editAvatarPreview,
      }),
    });

    setEditingId(null);
    setEditAvatarPreview(null);
    fetchPlayers();
  };

  const deletePlayer = async (id: string, playerName: string) => {
    if (!confirm(`Xóa ${playerName}?`)) return;
    await fetch(`/api/players/${id}`, { method: "DELETE" });
    fetchPlayers();
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold mb-3">Người chơi</h1>

      {/* Add form */}
      <form onSubmit={addPlayer} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 mb-4">
        <h2 className="font-semibold text-sm mb-2">Thêm người chơi</h2>
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            {/* Avatar preview/upload */}
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="shrink-0 relative group">
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                  Ảnh
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f, setAvatarPreview); }} />
            </button>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Tên" required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <select value={elo} onChange={(e) => setElo(e.target.value)}
              className="px-2 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="800">Mới chơi (800)</option>
              <option value="900">Yếu (900)</option>
              <option value="1000">Trung bình (1000)</option>
              <option value="1100">Khá (1100)</option>
              <option value="1200">Mạnh (1200)</option>
            </select>
          </div>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú (vd: Phòng Kỹ thuật)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={isGuest} onChange={(e) => setIsGuest(e.target.checked)} className="rounded" />
              Vãng lai
            </label>
            <button type="submit"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium active:bg-gray-700">
              Thêm
            </button>
          </div>
        </div>
      </form>

      {/* Player list */}
      {loading ? (
        <p className="text-gray-500 text-center py-8">Đang tải...</p>
      ) : (
        <div className="space-y-1.5">
          {players.map((player) =>
            editingId === player.id ? (
              /* ─── Edit mode ─── */
              <div key={player.id} className="bg-white rounded-lg border-2 border-blue-300 p-3">
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <button type="button" onClick={() => editFileRef.current?.click()} className="shrink-0">
                      {editAvatarPreview ? (
                        <img src={editAvatarPreview} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <Avatar player={{ name: editName, avatarUrl: null }} size="w-10 h-10" textSize="text-sm" />
                      )}
                      <input ref={editFileRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarFile(f, setEditAvatarPreview); }} />
                    </button>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <input type="number" value={editElo} onChange={(e) => setEditElo(e.target.value)}
                      className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Ghi chú"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input type="checkbox" checked={editIsGuest} onChange={(e) => setEditIsGuest(e.target.checked)} className="rounded" />
                      Vãng lai
                    </label>
                    <div className="flex gap-2">
                      <button onClick={cancelEdit}
                        className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg active:bg-gray-100">
                        Huỷ
                      </button>
                      <button onClick={saveEdit}
                        className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg active:bg-blue-700">
                        Lưu
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* ─── View mode ─── */
              <div key={player.id} className="flex items-center gap-2.5 bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                <Avatar player={player} />

                <Link href={`/players/${player.id}`} className="flex-1 min-w-0">
                  <span className="font-medium text-sm">{player.name}</span>
                  {player.note && (
                    <p className="text-[11px] text-gray-500 mt-0.5">{player.note}</p>
                  )}
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 font-mono">{Math.round(player.elo)} Elo</span>
                    <span className="text-xs text-gray-400">{player.matchesPlayed} trận</span>
                  </div>
                </Link>

                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${
                  player.isGuest ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"
                }`}>
                  {player.isGuest ? "Vãng lai" : "TV"}
                </span>

                <button onClick={() => startEdit(player)}
                  className="text-blue-400 active:text-blue-600 text-xs px-2 py-1 shrink-0">
                  Sửa
                </button>
                <button onClick={() => deletePlayer(player.id, player.name)}
                  className="text-red-400 active:text-red-600 text-xs px-2 py-1 shrink-0">
                  Xóa
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
