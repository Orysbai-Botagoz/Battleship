"use client";

import type { BoardState } from "@/types/game";

interface SunkShipsPanelProps {
  label: string;
  board: BoardState;
}

type ShipLength = 1 | 2 | 3 | 4;

const FLEET_CONFIG = {
  4: 1,
  3: 2,
  2: 3,
  1: 4,
} as const;

const getSunkCount = (board: BoardState, length: ShipLength) => {
  return board.ships.filter((ship) => ship.length === length && ship.isSunk).length;
};

const ShipSilhouette = ({ length, isSunk }: { length: ShipLength; isSunk: boolean }) => {
  const cellCount = length;
  const baseClasses = isSunk ? "bg-red-500" : "bg-slate-600";
  const borderClasses = isSunk ? "border-red-400" : "border-slate-500";

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: cellCount }).map((_, i) => (
        <div
          key={i}
          className={`h-6 w-6 rounded-sm border ${baseClasses} ${borderClasses} transition-all duration-300`}
        />
      ))}
    </div>
  );
};

export function SunkShipsPanel({ label, board }: SunkShipsPanelProps) {
  const shipTypes: ShipLength[] = [4, 3, 2, 1];

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <p className="mb-4 text-sm font-semibold text-slate-100">{label}</p>

      <div className="space-y-3">
        {shipTypes.map((length) => {
          const totalShips = FLEET_CONFIG[length];
          const sunkCount = getSunkCount(board, length);

          return (
            <div key={length} className="flex items-center justify-between gap-3">
              {/* Label */}
              <div className="flex w-12 flex-col items-center">
                <span className="text-xs font-semibold text-slate-300">{length}п</span>
                <span className="text-xs text-slate-500">
                  {sunkCount}/{totalShips}
                </span>
              </div>

              {/* Ship silhouettes */}
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: totalShips }).map((_, idx) => (
                  <ShipSilhouette key={idx} length={length} isSunk={idx < sunkCount} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
