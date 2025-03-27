import { NextRequest, NextResponse } from "next/server";

export function GET(req: NextRequest) {
  // Next.js App Routerを使用する場合は、カスタムサーバーと競合するためAPI機能を無効化
  // カスタムサーバー(server.js)側でSocketIOを処理
  return NextResponse.json({ message: "Socket.IO is handled by custom server" });
}