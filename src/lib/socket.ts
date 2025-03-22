import { io } from "socket.io-client";

// サーバーサイドでは実行しない
export const socket = typeof window !== "undefined" 
  ? io()
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