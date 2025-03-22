import { io } from "socket.io-client";

// WebSocketの接続先URL
const getSocketUrl = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  // Vercel環境での対応
  if (isProduction) {
    // 本番環境では独自のエンドポイントを使用しない（相対パスでリクエスト）
    return "";
  }
  return "http://localhost:3000"; // 開発環境ではローカルホストを使用
};

// サーバー環境の検出
const isVercel = typeof window !== "undefined" && 
  (window.location.hostname.endsWith('vercel.app') || 
   window.location.hostname.endsWith('claude-code-osello.vercel.app'));

// サーバーサイドでは実行しない
export const socket = typeof window !== "undefined" 
  ? io(getSocketUrl(), {
      path: isVercel ? '/socket.io' : '/api/socket.io', // Vercel環境では直接socket.ioへ
      transports: isVercel ? ['polling'] : ['websocket', 'polling'], // Vercel環境ではpollingのみ
      reconnectionAttempts: 10, // 再接続試行回数
      reconnectionDelay: 1000, // 再接続間隔（ミリ秒）
      timeout: 20000, // タイムアウト時間延長
    })
  : null;

// クライアント側でのSocket.IOの初期化
if (socket) {
  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
  });

  socket.on("connect_error", (error: Error) => {
    console.error("Socket connection error:", error);
  });

  socket.on("disconnect", (reason: string) => {
    console.log("Socket disconnected:", reason);
  });
}