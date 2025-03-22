import { io } from "socket.io-client";

// WebSocketの接続先URL
const getSocketUrl = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Renderではlocation.originを使用（サーバーと同じドメインでWebSocketが動作）
    return typeof window !== "undefined" ? window.location.origin : "";
  }
  
  return "http://localhost:3000"; // 開発環境ではローカルホストを使用
};

// サーバーサイドでは実行しない
export const socket = typeof window !== "undefined" 
  ? io(getSocketUrl(), {
      // 基本設定
      transports: ['websocket', 'polling'], // WebSocketを優先、必要に応じてPollingにフォールバック
      reconnectionAttempts: 10, // 再接続試行回数
      reconnectionDelay: 1000, // 再接続間隔（ミリ秒）
      timeout: 20000, // タイムアウト時間延長
      forceNew: true, // 新しい接続を強制
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