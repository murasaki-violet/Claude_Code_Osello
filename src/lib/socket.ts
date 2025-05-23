import { io } from "socket.io-client";

// WebSocketの接続先URL
const getSocketUrl = () => {
  // 実行環境に関わらずwindow.location.originを使用して同一オリジンにアクセスする
  return typeof window !== "undefined" ? window.location.origin : "";
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
      path: '/socket.io', // パスを明示的に指定
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