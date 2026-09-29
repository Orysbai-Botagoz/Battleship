"use client";

import { motion } from "framer-motion";
import { GameGrid } from "@/components/game/GameGrid";
import { SunkShipsPanel } from "@/components/game/SunkShipsPanel";
import type { BoardState, Coordinate, MoveEvent, PlayerSide } from "@/types/game";

interface BattleBoardProps {
  playerBoard: BoardState;
  enemyBoard: BoardState;
  activeSide: PlayerSide;
  isAiThinking: boolean;
  status: "in_progress" | "won" | "lost";
  moveHistory: MoveEvent[];
  onShoot: (coordinate: Coordinate) => void;
  onReset: () => void;
}

export function BattleBoard({
  playerBoard,
  enemyBoard,
  activeSide,
  isAiThinking,
  status,
  moveHistory,
  onShoot,
  onReset,
}: BattleBoardProps) {
  const title =
    status === "won"
      ? "Победа!"
      : status === "lost"
        ? "Поражение"
        : activeSide === "player"
          ? "Твой ход"
          : "ИИ думает...";

  const subtitle =
    status === "won"
      ? "Флот противника уничтожен"
      : status === "lost"
        ? "Твой флот уничтожен"
        : "Атакуй поле противника";

  return (
    <section className="flex w-full flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
      <motion.div
        key={title}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-slate-700 bg-slate-800/70 p-3"
      >
        <p className="text-base font-semibold text-ocean-100">{title}</p>
        <p className="text-sm text-slate-300">{subtitle}</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-200">Твоё поле</p>
          <GameGrid board={playerBoard} mode="player" disabled />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-200">Поле противника</p>
          <GameGrid
            board={enemyBoard}
            mode="enemy"
            onCellTap={onShoot}
            disabled={status !== "in_progress" || activeSide !== "player" || isAiThinking}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <SunkShipsPanel label="Потоплено у противника" board={enemyBoard} />
        <SunkShipsPanel label="Потоплено у тебя" board={playerBoard} />
      </div>

      <details className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-100">История ходов</summary>
        <ul className="mt-2 max-h-52 space-y-1 overflow-auto pr-1 text-xs text-slate-300">
          {moveHistory.length === 0 && <li>Пока нет ходов.</li>}
          {moveHistory.map((move, index) => (
            <li key={`${move.timestamp}-${index}`} className="rounded-lg bg-slate-800/70 px-2 py-1">
              #{move.turn} • {move.side === "player" ? "Ты" : "ИИ"} → ({move.target.row + 1},{" "}
              {move.target.col + 1}) • {move.isHit ? "Попадание" : "Мимо"}
              {move.isSunk ? " • Потоплен" : ""}
            </li>
          ))}
        </ul>
      </details>

      {(status === "won" || status === "lost") && (
        <button
          type="button"
          onClick={onReset}
          className="w-full rounded-xl bg-ocean-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-ocean-500/30"
        >
          Новая игра
        </button>
      )}
    </section>
  );
}
