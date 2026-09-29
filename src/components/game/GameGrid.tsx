"use client";

import { motion } from "framer-motion";
import type { BoardState, Coordinate } from "@/types/game";

interface GameGridProps {
  board: BoardState;
  mode: "placement" | "player" | "enemy";
  onCellTap?: (coordinate: Coordinate) => void;
  disabled?: boolean;
}

const getCellClasses = (state: BoardState["cells"][number][number]["state"], mode: GameGridProps["mode"]) => {
  if (state === "hit") {
    return "bg-rose-500/90 border-rose-300";
  }

  if (state === "miss" || state === "blocked") {
    return "bg-slate-700/80 border-slate-600";
  }

  if (state === "ship") {
    return mode === "enemy" ? "bg-ocean-950 border-ocean-900" : "bg-ocean-500/90 border-ocean-300";
  }

  return "bg-ocean-950 border-ocean-900";
};

export function GameGrid({ board, mode, onCellTap, disabled = false }: GameGridProps) {
  return (
    <div className="mx-auto w-full max-w-[min(92vw,460px)]">
      <div
        className="grid gap-1 rounded-xl border border-slate-700 bg-slate-900/70 p-2"
        style={{ gridTemplateColumns: `repeat(${board.size}, minmax(0, 1fr))` }}
      >
        {board.cells.flatMap((row) =>
          row.map((cell) => {
            const clickable = Boolean(onCellTap) && !disabled;
            return (
              <motion.button
                key={`${cell.row}-${cell.col}`}
                type="button"
                onClick={() => onCellTap?.({ row: cell.row, col: cell.col })}
                whileTap={clickable ? { scale: 0.93 } : undefined}
                className={[
                  "relative aspect-square min-h-7 rounded-[4px] border transition",
                  "sm:min-h-8",
                  clickable ? "cursor-pointer" : "cursor-default",
                  getCellClasses(cell.state, mode),
                ].join(" ")}
                aria-label={`cell-${cell.row}-${cell.col}`}
                disabled={!clickable}
              >
                {cell.state === "hit" && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-white"
                  />
                )}

                {(cell.state === "miss" || cell.state === "blocked") && (
                  <motion.span
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-slate-300"
                  />
                )}
              </motion.button>
            );
          }),
        )}
      </div>
    </div>
  );
}
