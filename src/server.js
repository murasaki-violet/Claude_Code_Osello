const { createServer } = require('http');
const { Server } = require('socket.io');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
console.log(`Running in ${dev ? 'development' : 'production'} mode`);

// Next.jsアプリの初期化
const app = next({ 
  dev,
  // カスタムサーバーを使用する場合は、ビルトインサーバーを無効化
  customServer: true 
});
const handle = app.getRequestHandler();

// Map型のオブジェクトを作成
const rooms = new Map();
const socketRooms = new Map();

// ゲームステータスの列挙体
const GameStatus = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
};

// 初期ボードを作成する関数
function createInitialBoard() {
  const board = Array(8).fill(null).map(() => 
    Array(8).fill("empty")
  );
  
  // 初期配置
  board[3][3] = "white";
  board[3][4] = "black";
  board[4][3] = "black";
  board[4][4] = "white";
  
  return board;
}

// 指定された位置に石を置くことができるかチェック
function isValidMove(board, row, col, color) {
  // すでに石が置かれている場合は無効
  if (board[row][col] !== "empty") return false;
  
  // 相手の色
  const opponentColor = color === "black" ? "white" : "black";
  
  // 8方向をチェック
  const directions = [
    [-1, -1], [-1, 0], [-1, 1], // 上方向
    [0, -1],           [0, 1],  // 左右
    [1, -1],  [1, 0],  [1, 1]   // 下方向
  ];
  
  let isValid = false;
  
  for (const [dx, dy] of directions) {
    let x = row + dx;
    let y = col + dy;
    
    // 隣がボード内かつ相手の色かチェック
    if (x >= 0 && x < 8 && y >= 0 && y < 8 && board[x][y] === opponentColor) {
      // さらに同じ方向に進む
      x += dx;
      y += dy;
      
      // ボード内の間ループ
      while (x >= 0 && x < 8 && y >= 0 && y < 8) {
        // 空のマスに到達したら無効
        if (board[x][y] === "empty") break;
        
        // 自分の色に到達したら、この方向は有効
        if (board[x][y] === color) {
          isValid = true;
          break;
        }
        
        // 相手の色ならさらに進む
        x += dx;
        y += dy;
      }
    }
  }
  
  return isValid;
}

// 盤面で有効な手を全て取得
function getValidMoves(board, color) {
  const validMoves = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (isValidMove(board, row, col, color)) {
        validMoves.push([row, col]);
      }
    }
  }
  
  return validMoves;
}

// 石を置いて盤面を更新
function makeMove(board, row, col, color) {
  // ボードをコピー
  const newBoard = JSON.parse(JSON.stringify(board));
  
  // 相手の色
  const opponentColor = color === "black" ? "white" : "black";
  
  // 石を置く
  newBoard[row][col] = color;
  
  let flippedCount = 0;
  
  // 8方向をチェック
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];
  
  for (const [dx, dy] of directions) {
    let x = row + dx;
    let y = col + dy;
    
    // この方向で裏返す石の候補
    const flips = [];
    
    // 隣がボード内かつ相手の色かチェック
    if (x >= 0 && x < 8 && y >= 0 && y < 8 && newBoard[x][y] === opponentColor) {
      flips.push([x, y]);
      
      // さらに同じ方向に進む
      x += dx;
      y += dy;
      
      // ボード内の間ループ
      while (x >= 0 && x < 8 && y >= 0 && y < 8) {
        // 空のマスに到達したら無効
        if (newBoard[x][y] === "empty") {
          flips.length = 0;
          break;
        }
        
        // 自分の色に到達したら、この方向の石を全て裏返す
        if (newBoard[x][y] === color) {
          for (const [fx, fy] of flips) {
            newBoard[fx][fy] = color;
            flippedCount++;
          }
          break;
        }
        
        // 相手の色ならリストに追加してさらに進む
        flips.push([x, y]);
        x += dx;
        y += dy;
      }
    }
  }
  
  return { newBoard, flippedCount };
}

// ライフゲームの一世代を計算
function computeNextGeneration(board, playerColor) {
  const newBoard = JSON.parse(JSON.stringify(board));
  const liveCells = [];
  
  // まず生きているセル（プレイヤーの石）の位置をリストアップ
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === playerColor) {
        liveCells.push([row, col]);
      }
    }
  }
  
  // 各セルの生死を判定
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      // 周囲の生きているセル（プレイヤーの石）の数をカウント
      let liveNeighbors = 0;
      
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue; // 自分自身はカウントしない
          
          const nx = row + dx;
          const ny = col + dy;
          
          if (nx >= 0 && nx < 8 && ny >= 0 && ny < 8 && board[nx][ny] === playerColor) {
            liveNeighbors++;
          }
        }
      }
      
      // ライフゲームのルールを適用
      if (board[row][col] === playerColor) {
        // 生きているセル
        if (liveNeighbors < 2 || liveNeighbors > 3) {
          // 過疎または過密で死滅
          newBoard[row][col] = "empty";
        }
        // 2か3なら生存（そのまま）
      } else if (board[row][col] === "empty") {
        // 空のセルで、周囲に3つの生きたセルがあれば誕生
        if (liveNeighbors === 3) {
          newBoard[row][col] = playerColor;
        }
      }
      // 相手の石はそのまま（ライフゲームの計算では無視される）
    }
  }
  
  return newBoard;
}

// ゲームが終了したかチェック
function isGameOver(board) {
  // 黒と白の両方の有効な手がなければゲーム終了
  return getValidMoves(board, "black").length === 0 && getValidMoves(board, "white").length === 0;
}

// 勝者を判定
function getWinner(board) {
  let blackCount = 0;
  let whiteCount = 0;
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === "black") blackCount++;
      else if (board[row][col] === "white") whiteCount++;
    }
  }
  
  if (blackCount > whiteCount) return "black";
  if (whiteCount > blackCount) return "white";
  return "draw";
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "OPTIONS"],
      credentials: true
    },
    // Render環境向け設定 (WebSocketサポート)
    transports: ["websocket", "polling"],
    // 接続安定性向上のためのオプション
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e8,
    // クライアントの自動再接続設定
    allowEIO3: true
  });

  // Socket.IOの設定
  io.on('connection', (socket) => {
    console.log('New connection:', socket.id);
    
    // ルームに参加
    socket.on('joinRoom', ({ roomId, playerId }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }
      
      // ソケットをルームに追加
      socket.join(roomId);
      socketRooms.set(socket.id, roomId);
      
      console.log(`Player ${playerId} joined room ${roomId}`);
      
      // 現在の有効な手を計算
      const availableMoves = getValidMoves(room.board, room.currentTurn);
      
      // ゲーム状態を全員に送信
      io.to(roomId).emit('gameState', {
        room,
        availableMoves,
      });
    });
    
    // 観戦者として参加
    socket.on('spectateRoom', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }
      
      // ソケットをルームに追加（観戦者）
      socket.join(roomId);
      socketRooms.set(socket.id, roomId);
      
      console.log(`Spectator joined room ${roomId}`);
      
      // 現在の有効な手を計算
      const availableMoves = getValidMoves(room.board, room.currentTurn);
      
      // ゲーム状態を全員に送信
      io.to(roomId).emit('gameState', {
        room,
        availableMoves,
      });
    });
    
    // プレイヤーがルームから離脱
    socket.on('leaveRoom', ({ roomId }) => {
      socket.leave(roomId);
      socketRooms.delete(socket.id);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    });
    
    // 石を置く
    socket.on('makeMove', ({ roomId, playerId, row, col }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }
      
      // プレイヤーが見つからない場合
      const player = room.players.find(p => p.id === playerId);
      if (!player) {
        socket.emit('error', 'Player not found');
        return;
      }
      
      // ゲームがプレイ中でない場合
      if (room.status !== GameStatus.PLAYING) {
        socket.emit('error', 'Game is not in progress');
        return;
      }
      
      // ライフゲーム実行中の場合
      if (room.isLifeGameActive) {
        socket.emit('error', 'Life game is in progress');
        return;
      }
      
      // プレイヤーのターンでない場合
      if (player.color !== room.currentTurn) {
        socket.emit('error', 'Not your turn');
        return;
      }
      
      // 有効な手かチェック
      const validMoves = getValidMoves(room.board, room.currentTurn);
      const isValid = validMoves.some(([r, c]) => r === row && c === col);
      
      if (!isValid) {
        socket.emit('error', 'Invalid move');
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
      room.currentTurn = room.currentTurn === 'black' ? 'white' : 'black';
      
      // 次のプレイヤーが置ける場所があるかチェック
      const nextValidMoves = getValidMoves(room.board, room.currentTurn);
      
      // 置ける場所がない場合はパス
      if (nextValidMoves.length === 0) {
        // 両方とも置けない場合はゲーム終了
        if (getValidMoves(room.board, room.currentTurn === 'black' ? 'white' : 'black').length === 0) {
          room.status = GameStatus.GAME_OVER;
          room.winner = getWinner(room.board);
        } else {
          // 次のプレイヤーもパスの場合はゲーム終了
          room.currentTurn = room.currentTurn === 'black' ? 'white' : 'black';
        }
      }
      
      // 更新したルーム情報を保存
      rooms.set(roomId, room);
      
      // 現在の有効な手を計算
      const availableMoves = getValidMoves(room.board, room.currentTurn);
      
      // ゲーム状態を全員に送信
      io.to(roomId).emit('gameState', {
        room,
        availableMoves,
      });
    });
    
    // ライフゲームを実行
    socket.on('activateLifeGame', ({ roomId, playerId, generations }) => {
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }
      
      // プレイヤーが見つからない場合
      const player = room.players.find(p => p.id === playerId);
      if (!player) {
        socket.emit('error', 'Player not found');
        return;
      }
      
      // ゲームがプレイ中でない場合
      if (room.status !== GameStatus.PLAYING) {
        socket.emit('error', 'Game is not in progress');
        return;
      }
      
      // プレイヤーのターンでない場合
      if (player.color !== room.currentTurn) {
        socket.emit('error', 'Not your turn');
        return;
      }
      
      // ライフゲージが満タンでない場合
      if (!player.isLifeGaugeReady) {
        socket.emit('error', 'Life gauge is not ready');
        return;
      }
      
      // 世代数の上限を設定
      const safeGenerations = Math.min(Math.max(1, generations), 10);
      
      // ライフゲーム実行中フラグを設定
      room.isLifeGameActive = true;
      room.lifeGameGenerations = safeGenerations;
      rooms.set(roomId, room);
      
      // 現在の状態を送信
      io.to(roomId).emit('gameState', {
        room,
        availableMoves: [],
      });
      
      // ライフゲームを実行（各世代を一定間隔で処理）
      let currentGeneration = 0;
      const interval = setInterval(() => {
        // 次の世代を計算
        room.board = computeNextGeneration(room.board, player.color);
        currentGeneration++;
        
        // 現在の状態を送信
        io.to(roomId).emit('gameState', {
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
          room.currentTurn = room.currentTurn === 'black' ? 'white' : 'black';
          
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
          io.to(roomId).emit('gameState', {
            room,
            availableMoves,
          });
        }
      }, 1000); // 1秒ごとに次の世代を計算
    });
    
    // 切断時の処理
    socket.on('disconnect', () => {
      const roomId = socketRooms.get(socket.id);
      if (roomId) {
        socket.leave(roomId);
        socketRooms.delete(socket.id);
        console.log(`Socket ${socket.id} disconnected from room ${roomId}`);
      }
    });
  });

  // 以前のAPIエンドポイントハンドラを削除
  // リクエストは新しいハンドラで全て処理

  // サーバーのポート設定
  const port = process.env.PORT || 3000;
  
  // カスタムリクエストハンドラを作成
  const customRequestHandler = function(req, res) {
    const parsedUrl = parse(req.url, true);
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    
    // API関連のリクエストを処理するが、リクエストが他のハンドラによって既に処理されていないか確認
    if (req.url.startsWith('/api/rooms') && !res.headersSent) {
      // GETリクエスト - ルーム一覧
      if (req.method === 'GET' && req.url === '/api/rooms') {
        try {
          // 作成日時の新しい順にソート
          const sortedRooms = [...rooms.values()].sort((a, b) => 
            b.createdAt.getTime() - a.createdAt.getTime()
          );
          
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(sortedRooms));
        } catch (error) {
          console.error('Error fetching rooms:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to fetch rooms' }));
        }
        return;
      }
      
      // POSTリクエスト - 新しいルーム作成
      if (req.method === 'POST' && req.url === '/api/rooms') {
        console.log('ルーム作成リクエスト受信');
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          if (res.headersSent) {
            console.log('レスポンスは既に送信済みのため処理をスキップ');
            return;
          }
          try {
            let parsedBody;
            try {
              parsedBody = JSON.parse(body);
            } catch (parseError) {
              console.error('JSON parse error:', parseError);
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
              return;
            }
            
            const { name, playerName } = parsedBody;
            
            if (!name || !playerName) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Room name and player name are required' }));
              return;
            }
            
            try {
              const { v4: uuidv4 } = require('uuid');
              const roomId = uuidv4();
              const playerId = uuidv4();
              
              const player = {
                id: playerId,
                name: playerName,
                color: 'black', // 部屋を作成したプレイヤーは黒（先手）
                lifeGaugePoints: 0,
                isLifeGaugeReady: false,
              };
              
              const initialBoard = createInitialBoard();
              
              const room = {
                id: roomId,
                name,
                players: [player],
                board: initialBoard,
                currentTurn: 'black',
                status: GameStatus.WAITING,
                isLifeGameActive: false,
                createdAt: new Date(),
              };
              
              // 部屋情報を保存
              try {
                rooms.set(roomId, room);
              } catch (storageError) {
                console.error('Room storage error:', storageError);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Failed to store room data' }));
                return;
              }
              
              // レスポンスを返す
              const responseBody = {
                id: roomId,
                playerId
              };
              console.log('ルーム作成成功:', { roomId, playerId });
              
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(responseBody));
            } catch (roomCreationError) {
              console.error('Room creation error:', roomCreationError);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to create room' }));
            }
          } catch (error) {
            console.error('Unexpected error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
        
        return;
      }
      
      // ルーム情報を取得
      const roomIdMatch = req.url.match(/^\/api\/rooms\/([^\/]+)$/);
      if (req.method === 'GET' && roomIdMatch) {
        try {
          const roomId = roomIdMatch[1];
          console.log('ルーム情報取得リクエスト:', roomId);
          
          if (res.headersSent) {
            console.log('レスポンスは既に送信済みのため処理をスキップ');
            return;
          }
          
          if (!roomId || typeof roomId !== 'string') {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid room ID' }));
            return;
          }
          
          const room = rooms.get(roomId);
          
          if (!room) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Room not found' }));
            return;
          }
          
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(room));
        } catch (error) {
          console.error('Error retrieving room:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to retrieve room data' }));
        }
        return;
      }
      
      // ルームに参加
      const joinMatch = req.url.match(/^\/api\/rooms\/([^\/]+)\/join$/);
      if (req.method === 'POST' && joinMatch) {
        const roomId = joinMatch[1];
        console.log('ルーム参加リクエスト受信:', roomId);
        
        // リクエストボディを取得
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          if (res.headersSent) {
            console.log('レスポンスは既に送信済みのため処理をスキップ');
            return;
          }
          try {
            let parsedBody;
            try {
              parsedBody = JSON.parse(body);
            } catch (parseError) {
              console.error('JSON parse error:', parseError);
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
              return;
            }
            
            const { playerName } = parsedBody;
            
            if (!playerName) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Player name is required' }));
              return;
            }
            
            try {
              const room = rooms.get(roomId);
              
              if (!room) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Room not found' }));
                return;
              }
              
              // 部屋がすでに満員か、待機中でない場合はエラー
              if (room.players.length >= 2 || room.status !== GameStatus.WAITING) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ 
                  error: 'Room is full or game is already in progress' 
                }));
                return;
              }
              
              const { v4: uuidv4 } = require('uuid');
              const playerId = uuidv4();
              
              const player = {
                id: playerId,
                name: playerName,
                color: 'white', // 2人目のプレイヤーは白（後手）
                lifeGaugePoints: 0,
                isLifeGaugeReady: false,
              };
              
              // プレイヤーを追加
              room.players.push(player);
              
              // 2人揃ったらゲームを開始
              if (room.players.length === 2) {
                room.status = GameStatus.PLAYING;
              }
              
              // 更新した部屋情報を保存
              try {
                rooms.set(roomId, room);
              } catch (storageError) {
                console.error('Room update error:', storageError);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Failed to update room data' }));
                return;
              }
              
              // レスポンスを返す
              const responseBody = {
                success: true,
                playerId
              };
              console.log('ルーム参加成功:', { roomId, playerId });
              
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(responseBody));
            } catch (roomJoinError) {
              console.error('Room join error:', roomJoinError);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to join room' }));
            }
          } catch (error) {
            console.error('Unexpected error:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        });
        
        return;
      }
    } else {
      // APIでないリクエストはNext.jsに処理を任せる
      handle(req, res, parsedUrl);
    }
  };
  
  // サーバーのリクエストハンドラを設定
  server.on('request', customRequestHandler);
  
  // エラーハンドリングを追加したサーバー起動
  server.listen(port, (err) => {
    if (err) {
      console.error('Failed to start server:', err);
      throw err;
    }
    console.log(`> Server ready on port ${port}`);
    console.log(`> API endpoints available at /api/rooms`);
  });
  
  // 予期せぬエラーをキャッチ
  server.on('error', (err) => {
    console.error('Server error:', err);
  });
  
  // プロセス終了時のクリーンアップ
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
  
  // 未処理の例外をキャッチ
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    // サーバーが完全にクラッシュするのを防ぐ
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // サーバーが完全にクラッシュするのを防ぐ
  });
});