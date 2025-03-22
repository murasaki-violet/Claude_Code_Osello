import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { GameStatus, Player } from "@/lib/types";
import { rooms } from "@/lib/store";
import { getValidMoves } from "@/lib/game";

interface Params {
  id: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  const roomId = params.id;
  const { playerName } = await request.json();

  if (!playerName) {
    return NextResponse.json(
      { error: "Player name is required" },
      { status: 400 }
    );
  }

  const room = rooms.get(roomId);

  if (!room) {
    return NextResponse.json(
      { error: "Room not found" },
      { status: 404 }
    );
  }

  // 部屋がすでに満員か、プレイ中以外の場合はエラー
  if (room.players.length >= 2 && room.status !== GameStatus.WAITING) {
    return NextResponse.json(
      { error: "Room is full or game is already in progress" },
      { status: 400 }
    );
  }

  const playerId = uuidv4();

  const player: Player = {
    id: playerId,
    name: playerName,
    color: "white", // 2人目のプレイヤーは白（後手）
    lifeGaugePoints: 0,
    isLifeGaugeReady: false,
  };

  // プレイヤーを追加
  room.players.push(player);

  // 2人揃ったらゲームを開始
  if (room.players.length === 2) {
    room.status = GameStatus.PLAYING;
  }

  // 更新した部屋情報を保存
  rooms.set(roomId, room);

  return NextResponse.json({
    success: true,
    playerId
  });
}