"use client";

import { motion } from "framer-motion";
import { BattleBoard } from "@/components/game/BattleBoard";
import { ShipPlacementBoard } from "@/components/game/ShipPlacementBoard";
import { useBattleshipGame } from "@/hooks/useBattleshipGame";

export function GameScreen() {
  const game = useBattleshipGame();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <h1 className="text-2xl font-bold tracking-tight text-ocean-200 sm:text-3xl">Морской Бой</h1>
        <p className="mt-1 text-sm text-slate-300">Mobile-first режим: расстановка, бой, история ходов.</p>
      </header>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {game.status === "placement" ? (
          <ShipPlacementBoard
            board={game.playerBoard}
            orientation={game.orientation}
            selectedShipLength={game.selectedShipLength}
            remainingByLength={game.remainingByLength}
            difficulty={game.difficulty}
            message={game.message}
            onSelectLength={game.setSelectedShipLength}
            onToggleOrientation={game.rotate}
            onAutoPlace={game.autoPlace}
            onClear={game.clearPlacement}
            onCellTap={game.placeSelectedShipAt}
            onRemoveShip={game.removeShip}
            onStartBattle={game.startBattle}
            onChangeDifficulty={game.setDifficulty}
          />
        ) : (
          <BattleBoard
            playerBoard={game.playerBoard}
            enemyBoard={game.aiBoard}
            activeSide={game.activeSide}
            isAiThinking={game.isAiThinking}
            status={game.status}
            moveHistory={game.moveHistory}
            onShoot={game.shootAtEnemy}
            onReset={game.resetToPlacement}
          />
        )}
      </motion.div>
    </main>
  );
}
