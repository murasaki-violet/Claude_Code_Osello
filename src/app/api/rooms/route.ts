import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { GameStatus, Room, Player } from "@/lib/types";
import { createInitialBoard, getValidMoves } from "@/lib/game";
import { rooms } from "@/lib/store";

// Next.js App Routerを使用する場合は、カスタムサーバーと競合するためAPI機能を無効化
// カスタムサーバー(server.js)側でAPIを処理
export async function GET() {
  return NextResponse.json({ message: "API is handled by custom server" });
}

export async function POST() {
  return NextResponse.json({ message: "API is handled by custom server" });
}