import { NextRequest } from "next/server";
import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";

// このエンドポイントはクライアント側のプロキシとして機能
// Vercel環境では直接WebSocket通信はできないため、このAPIルートを経由して接続

export async function GET(req: NextRequest) {
  // このAPIルートはVercelでのSocketサポートのための存在であり、
  // 実際のソケット処理はサーバーサイドで行われる
  if (process.env.NODE_ENV === "production") {
    // 本番環境では通常のURLへリダイレクト
    return new Response("WebSocket server endpoint for Socket.IO", {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  // 開発環境ではローカルのSocket.IOサーバーを使用
  return new Response("Local WebSocket server", { status: 200 });
}

// Socket.IOの拡張API Routeハンドラ
// Vercelでは実際には使用されませんが、ローカル開発用に必要
export function POST() {
  return new Response("Socket.IO POST endpoint", { status: 200 });
}

// Vercelとの互換性のためにOPTIONSメソッドを追加
export function OPTIONS() {
  return new Response("", {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}