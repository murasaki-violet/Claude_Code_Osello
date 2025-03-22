"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Room } from "@/lib/types";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomName, setRoomName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // ローカルストレージから名前を取得
    const savedName = localStorage.getItem("playerName");
    if (savedName) setPlayerName(savedName);
    
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      setRooms(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      setLoading(false);
    }
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !playerName.trim()) return;

    // プレイヤー名をローカルストレージに保存
    localStorage.setItem("playerName", playerName);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: roomName, playerName }),
      });

      const data = await res.json();
      if (data.playerId) {
        sessionStorage.setItem(`room_${data.id}_playerId`, data.playerId);
      }
      router.push(`/rooms/${data.id}`);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  const joinRoom = async (roomId: string) => {
    if (!playerName.trim()) return;

    // プレイヤー名をローカルストレージに保存
    localStorage.setItem("playerName", playerName);

    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playerName }),
      });

      const data = await res.json();
      if (data.success && data.playerId) {
        sessionStorage.setItem(`room_${roomId}_playerId`, data.playerId);
        router.push(`/rooms/${roomId}`);
      }
    } catch (error) {
      console.error("Error joining room:", error);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-8">
        <Link 
          href="/"
          className="inline-block py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          トップに戻る
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">ルーム一覧</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">新しいルームを作成</h2>
          <form onSubmit={createRoom} className="space-y-4">
            <div>
              <label htmlFor="playerName" className="block mb-1 font-medium">あなたの名前</label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <div>
              <label htmlFor="roomName" className="block mb-1 font-medium">ルーム名</label>
              <input
                type="text"
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full p-2 border rounded"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              ルームを作成
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">参加可能なルーム</h2>
          
          {loading ? (
            <p>読み込み中...</p>
          ) : rooms.length > 0 ? (
            <div className="space-y-4">
              {rooms.map((room) => (
                <div key={room.id} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">{room.name}</h3>
                    <span className="text-sm px-2 py-1 rounded bg-gray-100">
                      {room.status === "waiting" ? "待機中" : room.status === "playing" ? "プレイ中" : "終了"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    プレイヤー: {room.players.length}/2
                  </div>
                  {room.players.length < 2 && room.status === "waiting" && (
                    <button
                      onClick={() => joinRoom(room.id)}
                      className="w-full py-2 px-3 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      disabled={!playerName.trim()}
                    >
                      参加する
                    </button>
                  )}
                  {(room.players.length >= 2 || room.status !== "waiting") && (
                    <button
                      onClick={() => router.push(`/rooms/${room.id}`)}
                      className="w-full py-2 px-3 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                    >
                      観戦する
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>現在参加可能なルームはありません。新しいルームを作成してください。</p>
          )}

          <div className="mt-4">
            <button 
              onClick={fetchRooms}
              className="py-2 px-4 bg-gray-200 rounded hover:bg-gray-300 transition-colors"
            >
              更新
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
