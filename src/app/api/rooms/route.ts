import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { GameStatus, Room, Player } from "@/lib/types";
import { createInitialBoard, getValidMoves } from "@/lib/game";
import { rooms } from "@/lib/store";

// ルーム一覧を取得
export async function GET() {
  // 作成日時の新しい順にソート
  const sortedRooms = [...rooms.values()].sort((a, b) => 
    b.createdAt.getTime() - a.createdAt.getTime()
  );
  
  return NextResponse.json(sortedRooms);
}

// 新しいルームを作成
export async function POST(req: Request) {
  try {
    // リクエストの解析
    let bodyData;
    try {
      bodyData = await req.json();
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    
    const { name, playerName } = bodyData;
    
    if (!name || !playerName) {
      return NextResponse.json(
        { error: "Room name and player name are required" },
        { status: 400 }
      );
    }
    
    const roomId = uuidv4();
    const playerId = uuidv4();
    
    const player: Player = {
      id: playerId,
      name: playerName,
      color: "black", // 部屋を作成したプレイヤーは黒（先手）
      lifeGaugePoints: 0,
      isLifeGaugeReady: false,
    };
    
    const initialBoard = createInitialBoard();
    
    const room: Room = {
      id: roomId,
      name,
      players: [player],
      board: initialBoard,
      currentTurn: "black",
      status: GameStatus.WAITING,
      isLifeGameActive: false,
      createdAt: new Date(),
    };
    
    // ルームをデータストアに保存
    try {
      rooms.set(roomId, room);
    } catch (error) {
      console.error("Failed to store room data:", error);
      return NextResponse.json(
        { error: "Failed to create room" },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      id: roomId,
      playerId 
    });
  } catch (error) {
    console.error("Unexpected error creating room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}