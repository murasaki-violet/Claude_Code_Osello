export type CellState = 'empty' | 'black' | 'white';

export type GameBoard = CellState[][];

export enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  GAME_OVER = 'game_over',
}

export type Player = {
  id: string;
  name: string;
  color?: 'black' | 'white';
  lifeGaugePoints: number;
  isLifeGaugeReady: boolean;
};

export type Room = {
  id: string;
  name: string;
  players: Player[];
  board: GameBoard;
  currentTurn: 'black' | 'white';
  status: GameStatus;
  winner?: 'black' | 'white' | 'draw';
  isLifeGameActive: boolean;
  lifeGameGenerations?: number;
  createdAt: Date;
};

export type GameMove = {
  roomId: string;
  playerId: string;
  row: number;
  col: number;
};

export type LifeGameAction = {
  roomId: string;
  playerId: string;
  generations: number;
};

export type GameState = {
  room: Room | null;
  availableMoves: [number, number][];
};
