"use client";

import { useEffect, useMemo, useState } from "react";
import {
  applyAIShotFeedback,
  canPlaceShip,
  chooseAIShot,
  createEmptyBoard,
  fireAt,
  placeFleetRandomly,
  placeShip,
  removeShip as removeShipFromBoard,
  validateFleet,
} from "@/lib/game";
import { FLEET_CONFIG } from "@/types/game";
import type { AIState, Axis, BoardState, Coordinate, Difficulty, MoveEvent, PlayerSide } from "@/types/game";

type ShipLength = 1 | 2 | 3 | 4;

const FULL_FLEET: ShipLength[] = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

const getRemainingByLength = (board: BoardState): Record<ShipLength, number> => {
  const placed: Record<ShipLength, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  board.ships.forEach((ship) => {
    placed[ship.length] += 1;
  });

  return {
    4: FLEET_CONFIG[4] - placed[4],
    3: FLEET_CONFIG[3] - placed[3],
    2: FLEET_CONFIG[2] - placed[2],
    1: FLEET_CONFIG[1] - placed[1],
  };
};

const getInitialAIState = (difficulty: Difficulty): AIState => ({
  difficulty,
  visited: [],
  targetState: null,
  remainingEnemyShips: [...FULL_FLEET],
});

const canShootCell = (board: BoardState, coordinate: Coordinate): boolean => {
  const cell = board.cells[coordinate.row][coordinate.col];
  return cell.state !== "hit" && cell.state !== "miss" && cell.state !== "blocked";
};

export function useBattleshipGame() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [orientation, setOrientation] = useState<Axis>("horizontal");
  const [selectedShipLength, setSelectedShipLength] = useState<ShipLength>(4);

  const [playerBoard, setPlayerBoard] = useState<BoardState>(() => createEmptyBoard());
  const [aiBoard, setAiBoard] = useState<BoardState>(() => createEmptyBoard());

  const [status, setStatus] = useState<"placement" | "in_progress" | "won" | "lost">("placement");
  const [activeSide, setActiveSide] = useState<PlayerSide>("player");
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiState, setAiState] = useState<AIState>(() => getInitialAIState(difficulty));
  const [turn, setTurn] = useState(1);
  const [moveHistory, setMoveHistory] = useState<MoveEvent[]>([]);
  const [message, setMessage] = useState<string>("");

  const remainingByLength = useMemo(() => getRemainingByLength(playerBoard), [playerBoard]);
  const allShipsPlaced = useMemo(
    () => Object.values(remainingByLength).every((count) => count === 0),
    [remainingByLength],
  );

  // Удаление корабля по ID с полным пересчетом сетки доски
  const removeShip = (shipId: string) => {
    if (status !== "placement") {
      return;
    }

    setPlayerBoard((prevBoard) => removeShipFromBoard(prevBoard, shipId));
  };

  const placeSelectedShipAt = (origin: Coordinate) => {
    if (status !== "placement") {
      return;
    }

    if (remainingByLength[selectedShipLength] <= 0) {
      const nextLength = (Object.keys(remainingByLength)
        .map((k) => Number(k) as ShipLength)
        .find((length) => remainingByLength[length] > 0) ?? null) as ShipLength | null;

      if (!nextLength) {
        setMessage("Флот уже полностью расставлен.");
        return;
      }

      setSelectedShipLength(nextLength);
      return;
    }

    const payload = {
      length: selectedShipLength,
      axis: orientation,
      origin,
      id: `player_ship_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    } as const;

    if (!canPlaceShip(playerBoard, payload)) {
      setMessage("Нельзя поставить корабль: пересечение, касание или выход за границы.");
      return;
    }

    const nextBoard = placeShip(playerBoard, payload);
    setPlayerBoard(nextBoard);
    setMessage("");

    const nextRemaining = getRemainingByLength(nextBoard);
    if (nextRemaining[selectedShipLength] <= 0) {
      const nextLength = (Object.keys(nextRemaining)
        .map((k) => Number(k) as ShipLength)
        .find((length) => nextRemaining[length] > 0) ?? selectedShipLength) as ShipLength;
      setSelectedShipLength(nextLength);
    }
  };

  const autoPlace = () => {
    if (status !== "placement") {
      return;
    }

    setPlayerBoard(placeFleetRandomly());
    setMessage("Флот расставлен автоматически.");
  };

  const clearPlacement = () => {
    if (status !== "placement") {
      return;
    }

    setPlayerBoard(createEmptyBoard());
    setSelectedShipLength(4);
    setMessage("Поле очищено.");
  };

  const rotate = () => {
    if (status !== "placement") {
      return;
    }

    setOrientation((prev) => (prev === "horizontal" ? "vertical" : "horizontal"));
  };

  const startBattle = () => {
    if (status !== "placement") {
      return;
    }

    if (!validateFleet(playerBoard)) {
      setMessage("Расставь все корабли по правилам перед стартом боя.");
      return;
    }

    setAiBoard(placeFleetRandomly());
    setAiState(getInitialAIState(difficulty));
    setMoveHistory([]);
    setTurn(1);
    setActiveSide("player");
    setStatus("in_progress");
    setMessage("");
  };

  const resetToPlacement = () => {
    setStatus("placement");
    setActiveSide("player");
    setIsAiThinking(false);
    setPlayerBoard(createEmptyBoard());
    setAiBoard(createEmptyBoard());
    setAiState(getInitialAIState(difficulty));
    setMoveHistory([]);
    setTurn(1);
    setSelectedShipLength(4);
    setOrientation("horizontal");
    setMessage("");
  };

  const shootAtEnemy = (coordinate: Coordinate) => {
    if (status !== "in_progress" || activeSide !== "player" || isAiThinking) {
      return;
    }

    if (!canShootCell(aiBoard, coordinate)) {
      return;
    }

    const { board: nextAIBoard, result } = fireAt(aiBoard, coordinate);
    setAiBoard(nextAIBoard);

    const playerMove: MoveEvent = {
      turn,
      side: "player",
      target: coordinate,
      isHit: result.isHit,
      isSunk: result.isSunk,
      sunkShipId: result.sunkShipId,
      timestamp: new Date().toISOString(),
    };

    setMoveHistory((prev) => [playerMove, ...prev].slice(0, 60));

    if (result.gameOver) {
      setStatus("won");
      setActiveSide("player");
      return;
    }

    if (!result.isHit) {
      setActiveSide("ai");
      setIsAiThinking(true);
    }
  };

  useEffect(() => {
    if (status !== "in_progress" || activeSide !== "ai" || !isAiThinking) {
      return;
    }

    const timeout = setTimeout(() => {
      const aiPick = chooseAIShot({
        aiState,
        enemyBoard: playerBoard,
      });

      const { board: nextPlayerBoard, result } = fireAt(playerBoard, aiPick.coordinate);
      const sunkLength = result.sunkShipId
        ? (nextPlayerBoard.ships.find((ship) => ship.id === result.sunkShipId)?.length as ShipLength | undefined)
        : undefined;

      const nextAIState = applyAIShotFeedback(aiPick.nextState, nextPlayerBoard, {
        coordinate: aiPick.coordinate,
        isHit: result.isHit,
        isSunk: result.isSunk,
        sunkShipLength: sunkLength,
      });

      setPlayerBoard(nextPlayerBoard);
      setAiState(nextAIState);

      const aiMove: MoveEvent = {
        turn,
        side: "ai",
        target: aiPick.coordinate,
        isHit: result.isHit,
        isSunk: result.isSunk,
        sunkShipId: result.sunkShipId,
        timestamp: new Date().toISOString(),
      };

      setMoveHistory((prev) => [aiMove, ...prev].slice(0, 60));

      if (result.gameOver) {
        setIsAiThinking(false);
        setStatus("lost");
        setActiveSide("ai");
        return;
      }

      if (result.isHit) {
        setIsAiThinking(true);
      } else {
        setIsAiThinking(false);
        setActiveSide("player");
        setTurn((prev) => prev + 1);
      }
    }, 650);

    return () => clearTimeout(timeout);
  }, [activeSide, aiState, isAiThinking, playerBoard, status, turn]);

  return {
    difficulty,
    setDifficulty,
    orientation,
    selectedShipLength,
    setSelectedShipLength,
    playerBoard,
    aiBoard,
    status,
    activeSide,
    isAiThinking,
    moveHistory,
    message,
    remainingByLength,
    allShipsPlaced,
    placeSelectedShipAt,
    removeShip,
    autoPlace,
    clearPlacement,
    rotate,
    startBattle,
    shootAtEnemy,
    resetToPlacement,
  };
}