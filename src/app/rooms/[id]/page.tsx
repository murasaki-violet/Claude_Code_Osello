"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import GameBoard from "@/components/GameBoard";
import { GameState, Room, Player } from "@/lib/types";
import { socket } from "@/lib/socket";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  
  const [gameState, setGameState] = useState<GameState>({ 
    room: null, 
    availableMoves: [] 
  });
  const [playerId, setPlayerId] = useState<string>("");
  const [lifeGameGenerations, setLifeGameGenerations] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!socket) return;
    
    // プレイヤーIDと名前を取得
    const storedPlayerId = sessionStorage.getItem(`room_${roomId}_playerId`);
    const playerName = localStorage.getItem("playerName") || "ゲスト";
    
    // ゲーム状態の更新をリッスン
    socket.on("gameState", (data: GameState) => {
      setGameState(data);
    });

    // エラーメッセージをリッスン
    socket.on("error", (message: string) => {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(""), 3000);
    });
    
    // 常にルーム情報を最初に取得
    fetch(`/api/rooms/${roomId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}: ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        if (data.error) {
          setErrorMessage(data.error);
          return;
        }
        
        // レスポンス形式の互換性対応（デバッグ情報を除く）
        const roomData = { ...data };
        
        // _debug フィールドを削除
        if (roomData._debug) {
          delete roomData._debug;
        }
        
        // 部屋が見つかった場合は情報を設定
        setGameState(prevState => ({
          ...prevState,
          room: roomData
        }));
        
        // すでにストアされたプレイヤーIDがある場合
        if (storedPlayerId) {
          // このプレイヤーIDが本当にこの部屋のプレイヤーか確認
          const playerExists = data.players.some(p => p.id === storedPlayerId);
          
          if (playerExists) {
            setPlayerId(storedPlayerId);
            // 既に部屋に参加しているプレイヤーとして接続
            socket.emit("joinRoom", { roomId, playerId: storedPlayerId });
            return;
          } else {
            // セッションストレージのIDが無効な場合はクリア
            sessionStorage.removeItem(`room_${roomId}_playerId`);
          }
        }
        
        // 参加可能かチェック
        if (data.players.length < 2 && data.status === "waiting") {
          // 参加可能な場合は参加処理
          fetch(`/api/rooms/${roomId}/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerName })
          })
            .then(res => {
              if (!res.ok) {
                throw new Error(`Server returned ${res.status}: ${res.statusText}`);
              }
              return res.json();
            })
            .then(joinData => {
              if (joinData.playerId) {
                setPlayerId(joinData.playerId);
                sessionStorage.setItem(`room_${roomId}_playerId`, joinData.playerId);
                socket.emit("joinRoom", { roomId, playerId: joinData.playerId });
              } else if (joinData.error) {
                setErrorMessage(joinData.error);
              }
            })
            .catch(err => {
              console.error("Error joining room:", err);
              setErrorMessage("ルームに参加できませんでした。");
            });
        } else {
          // 観戦者として接続
          socket.emit("spectateRoom", { roomId });
        }
      })
      .catch(err => {
        console.error("Error fetching room:", err);
        setErrorMessage("ルームの情報を取得できませんでした。");
      });

    // クリーンアップ
    return () => {
      socket.off("gameState");
      socket.off("error");
      socket.emit("leaveRoom", { roomId });
    };
  }, [roomId]);

  // 石を置く処理
  const handlePlaceStone = (row: number, col: number) => {
    if (!playerId || !gameState.room || !socket) return;
    
    // 移動が有効かチェック
    const isValidMove = gameState.availableMoves.some(
      ([r, c]) => r === row && c === col
    );
    
    if (!isValidMove || !socket) return;
    
    socket.emit("makeMove", { roomId, playerId, row, col });
  };

  // ライフゲームを実行する処理
  const handleLifeGame = () => {
    if (!playerId || !gameState.room || !socket) return;
    
    const currentPlayer = gameState.room.players.find(p => p.id === playerId);
    if (!currentPlayer?.isLifeGaugeReady) return;

    socket.emit("activateLifeGame", { 
      roomId, 
      playerId, 
      generations: lifeGameGenerations 
    });
  };

  // プレイヤー情報を表示
  const renderPlayerInfo = (player: Player | undefined, isCurrentTurn: boolean) => {
    if (!player) return <div className="h-24 bg-gray-100 rounded p-4">待機中...</div>;
    
    return (
      <div className={`h-24 rounded p-4 ${isCurrentTurn ? 'bg-yellow-100 border-2 border-yellow-400' : 'bg-gray-100'}`}>
        <div className="flex items-center">
          <div className={`w-6 h-6 rounded-full mr-2 ${player.color === 'black' ? 'bg-black' : 'bg-white border border-gray-400'}`}></div>
          <div>
            <p className="font-medium">{player.name}</p>
            <div className="mt-2 flex items-center">
              <div className="w-full bg-gray-300 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full ${player.isLifeGaugeReady ? 'bg-green-600' : 'bg-blue-600'}`} 
                  style={{ width: `${(player.lifeGaugePoints / 10) * 100}%` }}
                ></div>
              </div>
              <span className="ml-2 text-xs">{player.lifeGaugePoints}/10</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ゲーム状態に応じたメッセージを表示
  const renderGameStatus = () => {
    if (!gameState.room) return null;
    
    const { status, currentTurn, winner, isLifeGameActive } = gameState.room;
    
    if (isLifeGameActive) {
      return <div className="text-lg font-medium">ライフゲーム実行中...</div>;
    }
    
    if (status === "waiting") {
      return <div className="text-lg font-medium">対戦相手の参加を待っています...</div>;
    }
    
    if (status === "game_over") {
      if (winner === "draw") {
        return <div className="text-lg font-medium">引き分けです！</div>;
      }
      return <div className="text-lg font-medium">{winner === "black" ? "黒" : "白"}の勝利です！</div>;
    }
    
    return <div className="text-lg font-medium">{currentTurn === "black" ? "黒" : "白"}のターンです</div>;
  };

  // 自分のターンかどうかをチェック
  const isMyTurn = () => {
    if (!gameState.room || !playerId) return false;
    
    const myPlayer = gameState.room.players.find(p => p.id === playerId);
    return myPlayer?.color === gameState.room.currentTurn;
  };

  // ライフゲームボタンを表示するかどうか
  const canActivateLifeGame = () => {
    if (!gameState.room || !playerId || gameState.room.isLifeGameActive) return false;
    
    const myPlayer = gameState.room.players.find(p => p.id === playerId);
    return (
      myPlayer?.isLifeGaugeReady && 
      myPlayer?.color === gameState.room.currentTurn && 
      gameState.room.status === "playing"
    );
  };

  if (errorMessage) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{errorMessage}</p>
        </div>
        <Link href="/rooms" className="text-blue-600 hover:underline">
          ルーム一覧に戻る
        </Link>
      </div>
    );
  }

  if (!gameState.room) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-center">
          <p className="mb-4">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-6 flex justify-between items-center">
        <Link href="/rooms" className="text-blue-600 hover:underline">
          ← ルーム一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold">{gameState.room.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <GameBoard 
              board={gameState.room.board} 
              onCellClick={handlePlaceStone}
              availableMoves={isMyTurn() ? gameState.availableMoves : []}
              isLifeGameActive={gameState.room.isLifeGameActive}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-3">ゲーム情報</h2>
            {renderGameStatus()}
            
            <div className="mt-4 space-y-2">
              <h3 className="font-medium">プレイヤー</h3>
              {renderPlayerInfo(
                gameState.room.players.find(p => p.color === "black"),
                gameState.room.currentTurn === "black"
              )}
              {renderPlayerInfo(
                gameState.room.players.find(p => p.color === "white"),
                gameState.room.currentTurn === "white"
              )}
            </div>
          </div>

          {canActivateLifeGame() && (
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-3">ライフゲーム</h2>
              <p className="mb-2">ゲージが満タンです！ライフゲームを実行できます。</p>
              
              <div className="mb-3">
                <label className="block mb-1">世代数:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={lifeGameGenerations}
                  onChange={(e) => setLifeGameGenerations(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <button
                onClick={handleLifeGame}
                className="w-full py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                ライフゲームを実行
              </button>
            </div>
          )}

          <div className="bg-white p-4 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold mb-2">スコア</h2>
            <div className="flex justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-black mr-2"></div>
                <span>{gameState.room.board.flat().filter(cell => cell === "black").length}</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-white border border-gray-400 mr-2"></div>
                <span>{gameState.room.board.flat().filter(cell => cell === "white").length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}