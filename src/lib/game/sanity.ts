import { chooseAIShot } from "@/lib/game/ai";
import { createEmptyBoard, fireAt, placeFleetRandomly, validateFleet } from "@/lib/game/engine";
import type { AIState } from "@/types/game";

export interface SanityReport {
  fleetValidationPass: boolean;
  shotResolutionPass: boolean;
  aiSelectionPass: boolean;
}

export const runSanityChecks = (): SanityReport => {
  const board = placeFleetRandomly();
  const fleetValidationPass = validateFleet(board);

  const emptyBoard = createEmptyBoard();
  const missShot = fireAt(emptyBoard, { row: 0, col: 0 });
  const shotResolutionPass = missShot.result.isHit === false;

  const aiState: AIState = {
    difficulty: "hard",
    visited: [],
    targetState: null,
    remainingEnemyShips: [4, 3, 3, 2, 2, 2, 1, 1, 1, 1],
  };
  const aiPick = chooseAIShot({ aiState, enemyBoard: createEmptyBoard() });
  const aiSelectionPass = aiPick.coordinate.row >= 0 && aiPick.coordinate.col >= 0;

  return {
    fleetValidationPass,
    shotResolutionPass,
    aiSelectionPass,
  };
};
