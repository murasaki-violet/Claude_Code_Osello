"use client";

import { CellState } from "@/lib/types";

type GameBoardProps = {
  board: CellState[][];
  onCellClick: (row: number, col: number) => void;
  availableMoves: [number, number][];
  isLifeGameActive: boolean;
};

export default function GameBoard({ 
  board, 
  onCellClick, 
  availableMoves,
  isLifeGameActive
}: GameBoardProps) {
  const isMoveAvailable = (row: number, col: number) => {
    return availableMoves.some(([r, c]) => r === row && c === col);
  };

  return (
    <div className={`w-full aspect-square max-w-md mx-auto ${isLifeGameActive ? 'animate-pulse' : ''}`}>
      <div className="grid grid-cols-8 grid-rows-8 gap-1 h-full bg-green-800 p-1">
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`relative w-full h-full bg-green-700 flex items-center justify-center cursor-pointer transition-all duration-300
                ${isMoveAvailable(rowIndex, colIndex) ? 'bg-green-600 hover:bg-green-500' : ''}
              `}
              onClick={() => onCellClick(rowIndex, colIndex)}
            >
              {cell !== "empty" && (
                <div
                  className={`rounded-full w-[90%] h-[90%] ${cell === "black" ? "bg-black" : "bg-white"}
                    ${isLifeGameActive && cell !== "empty" ? 'animate-bounce' : ''}
                  `}
                />
              )}
              {isMoveAvailable(rowIndex, colIndex) && cell === "empty" && (
                <div className="absolute w-3 h-3 rounded-full bg-green-400 opacity-60" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
