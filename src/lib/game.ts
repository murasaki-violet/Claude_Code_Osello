import { CellState, GameBoard } from "./types";

// オセロの初期盤面を作成
export const createInitialBoard = (): GameBoard => {
  const board: GameBoard = Array(8).fill(null).map(() => 
    Array(8).fill("empty")
  );
  
  // 初期配置
  board[3][3] = "white";
  board[3][4] = "black";
  board[4][3] = "black";
  board[4][4] = "white";
  
  return board;
};

// 指定された位置に石を置くことができるかチェック
export const isValidMove = (board: GameBoard, row: number, col: number, color: "black" | "white"): boolean => {
  // すでに石が置かれている場合は無効
  if (board[row][col] !== "empty") return false;
  
  // 相手の色
  const opponentColor: CellState = color === "black" ? "white" : "black";
  
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
};

// 盤面で有効な手を全て取得
export const getValidMoves = (board: GameBoard, color: "black" | "white"): [number, number][] => {
  const validMoves: [number, number][] = [];
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (isValidMove(board, row, col, color)) {
        validMoves.push([row, col]);
      }
    }
  }
  
  return validMoves;
};

// 石を置いて盤面を更新
export const makeMove = (board: GameBoard, row: number, col: number, color: "black" | "white"): { newBoard: GameBoard, flippedCount: number } => {
  // ボードをコピー
  const newBoard: GameBoard = JSON.parse(JSON.stringify(board));
  
  // 相手の色
  const opponentColor: CellState = color === "black" ? "white" : "black";
  
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
    const flips: [number, number][] = [];
    
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
};

// ライフゲームの一世代を計算
export const computeNextGeneration = (board: GameBoard, playerColor: "black" | "white"): GameBoard => {
  const newBoard: GameBoard = JSON.parse(JSON.stringify(board));
  const liveCells: [number, number][] = [];
  
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
};

// ゲームが終了したかチェック
export const isGameOver = (board: GameBoard): boolean => {
  // 黒と白の両方の有効な手がなければゲーム終了
  return getValidMoves(board, "black").length === 0 && getValidMoves(board, "white").length === 0;
};

// 勝者を判定
export const getWinner = (board: GameBoard): "black" | "white" | "draw" => {
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
};
