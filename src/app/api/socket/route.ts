import { NextRequest, NextResponse } from "next/server";
import { Server } from "socket.io";
import { GameMove, LifeGameAction, GameStatus } from "@/lib/types";
import { rooms, socketRooms } from "@/lib/store";
import { 
  getValidMoves, 
  makeMove, 
  isGameOver, 
  getWinner,
  computeNextGeneration 
} from "@/lib/game";

// Socket.ioサーバーインスタンス
const io = new Server({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ソケット通信の設定
io.on("connection", (socket) => {
  console.log("New connection:", socket.id);
  
  // ルームに参加
  socket.on("joinRoom", ({ roomId, playerId }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("error", "Room not found");
      return;
    }
    
    // ソケットをルームに追加
    socket.join(roomId);
    socketRooms.set(socket.id, roomId);
    
    console.log(`Player ${playerId} joined room ${roomId}`);
    
    // 現在の有効な手を計算
    const availableMoves = getValidMoves(room.board, room.currentTurn);
    
    // ゲーム状態を全員に送信
    io.to(roomId).emit("gameState", {
      room,
      availableMoves,
    });
  });
  
  // 観戦者として参加
  socket.on("spectateRoom", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("error", "Room not found");
      return;
    }
    
    // ソケットをルームに追加（観戦者）
    socket.join(roomId);
    socketRooms.set(socket.id, roomId);
    
    console.log(`Spectator joined room ${roomId}`);
    
    // 現在の有効な手を計算
    const availableMoves = getValidMoves(room.board, room.currentTurn);
    
    // ゲーム状態を全員に送信
    io.to(roomId).emit("gameState", {
      room,
      availableMoves,
    });
  });
  
  // プレイヤーがルームから離脱
  socket.on("leaveRoom", ({ roomId }) => {
    socket.leave(roomId);
    socketRooms.delete(socket.id);
    console.log(`Socket ${socket.id} left room ${roomId}`);
  });
  
  // 石を置く
  socket.on("makeMove", ({ roomId, playerId, row, col }: GameMove) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("error", "Room not found");
      return;
    }
    
    // プレイヤーが見つからない場合
    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      socket.emit("error", "Player not found");
      return;
    }
    
    // ゲームがプレイ中でない場合
    if (room.status !== GameStatus.PLAYING) {
      socket.emit("error", "Game is not in progress");
      return;
    }
    
    // ライフゲーム実行中の場合
    if (room.isLifeGameActive) {
      socket.emit("error", "Life game is in progress");
      return;
    }
    
    // プレイヤーのターンでない場合
    if (player.color !== room.currentTurn) {
      socket.emit("error", "Not your turn");
      return;
    }
    
    // 有効な手かチェック
    const validMoves = getValidMoves(room.board, room.currentTurn);
    const isValid = validMoves.some(([r, c]) => r === row && c === col);
    
    if (!isValid) {
      socket.emit("error", "Invalid move");
      return;
    }
    
    // 石を置く
    const { newBoard, flippedCount } = makeMove(room.board, row, col, room.currentTurn);
    room.board = newBoard;
    
    // ひっくり返した石の数に応じてライフゲージを増加
    player.lifeGaugePoints += flippedCount;
    if (player.lifeGaugePoints >= 10) {
      player.lifeGaugePoints = 10;
      player.isLifeGaugeReady = true;
    }
    
    // 次のターンへ
    room.currentTurn = room.currentTurn === "black" ? "white" : "black";
    
    // 次のプレイヤーが置ける場所があるかチェック
    const nextValidMoves = getValidMoves(room.board, room.currentTurn);
    
    // 置ける場所がない場合はパス
    if (nextValidMoves.length === 0) {
      // 両方とも置けない場合はゲーム終了
      if (getValidMoves(room.board, room.currentTurn === "black" ? "white" : "black").length === 0) {
        room.status = GameStatus.GAME_OVER;
        room.winner = getWinner(room.board);
      } else {
        // 次のプレイヤーもパスの場合はゲーム終了
        room.currentTurn = room.currentTurn === "black" ? "white" : "black";
      }
    }
    
    // 更新したルーム情報を保存
    rooms.set(roomId, room);
    
    // 現在の有効な手を計算
    const availableMoves = getValidMoves(room.board, room.currentTurn);
    
    // ゲーム状態を全員に送信
    io.to(roomId).emit("gameState", {
      room,
      availableMoves,
    });
  });
  
  // ライフゲームを実行
  socket.on("activateLifeGame", ({ roomId, playerId, generations }: LifeGameAction) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit("error", "Room not found");
      return;
    }
    
    // プレイヤーが見つからない場合
    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      socket.emit("error", "Player not found");
      return;
    }
    
    // ゲームがプレイ中でない場合
    if (room.status !== GameStatus.PLAYING) {
      socket.emit("error", "Game is not in progress");
      return;
    }
    
    // プレイヤーのターンでない場合
    if (player.color !== room.currentTurn) {
      socket.emit("error", "Not your turn");
      return;
    }
    
    // ライフゲージが満タンでない場合
    if (!player.isLifeGaugeReady) {
      socket.emit("error", "Life gauge is not ready");
      return;
    }
    
    // 世代数の上限を設定
    const safeGenerations = Math.min(Math.max(1, generations), 10);
    
    // ライフゲーム実行中フラグを設定
    room.isLifeGameActive = true;
    room.lifeGameGenerations = safeGenerations;
    rooms.set(roomId, room);
    
    // 現在の状態を送信
    io.to(roomId).emit("gameState", {
      room,
      availableMoves: [],
    });
    
    // ライフゲームを実行（各世代を一定間隔で処理）
    let currentGeneration = 0;
    const interval = setInterval(() => {
      // 次の世代を計算
      room.board = computeNextGeneration(room.board, player.color as "black" | "white");
      currentGeneration++;
      
      // 現在の状態を送信
      io.to(roomId).emit("gameState", {
        room,
        availableMoves: [],
      });
      
      // 設定した世代数に達したら終了
      if (currentGeneration >= safeGenerations) {
        clearInterval(interval);
        
        // ライフゲーム終了処理
        room.isLifeGameActive = false;
        room.lifeGameGenerations = undefined;
        
        // ゲージをリセット
        player.lifeGaugePoints = 0;
        player.isLifeGaugeReady = false;
        
        // 次のターンへ
        room.currentTurn = room.currentTurn === "black" ? "white" : "black";
        
        // ゲーム終了チェック
        if (isGameOver(room.board)) {
          room.status = GameStatus.GAME_OVER;
          room.winner = getWinner(room.board);
        }
        
        // 更新したルーム情報を保存
        rooms.set(roomId, room);
        
        // 現在の有効な手を計算
        const availableMoves = getValidMoves(room.board, room.currentTurn);
        
        // 最終状態を送信
        io.to(roomId).emit("gameState", {
          room,
          availableMoves,
        });
      }
    }, 1000); // 1秒ごとに次の世代を計算
  });
  
  // 切断時の処理
  socket.on("disconnect", () => {
    const roomId = socketRooms.get(socket.id);
    if (roomId) {
      socket.leave(roomId);
      socketRooms.delete(socket.id);
      console.log(`Socket ${socket.id} disconnected from room ${roomId}`);
    }
  });
});

export function GET(req: NextRequest) {
  // WebSocket アップグレードをチェック
  if (req.headers.get('upgrade') !== 'websocket') {
    return new NextResponse('Expected Upgrade: websocket', { status: 426 });
  }

  // この段階では実際にSocketIOサーバーを起動できないため、
  // 単に200 OKを返す（Socket.IOクライアント側で接続試行される）
  return new NextResponse('Socket.IO server', { status: 200 });
}