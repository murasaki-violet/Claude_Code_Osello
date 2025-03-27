import { NextRequest, NextResponse } from "next/server";

interface Params {
  id: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  // Next.js App Routerを使用する場合は、カスタムサーバーと競合するためAPI機能を無効化
  // カスタムサーバー(server.js)側でAPIを処理
  return NextResponse.json({ message: "API is handled by custom server" });
}