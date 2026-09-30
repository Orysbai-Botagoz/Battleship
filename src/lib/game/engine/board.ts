import {
  ALL_DIRECTIONS,
  GAME_BOARD_SIZE,
  GAME_FLEET_CONFIG,
  ORTHOGONAL_DIRECTIONS,
} from "@/lib/game/constants";
import type { Axis, BoardCell, BoardState, Coordinate, ShipPlacement } from "@/types/game";

type ShipLength = 1 | 2 | 3 | 4;

export interface PlaceShipInput {
  id?: string;
  length: ShipLength;
  axis: Axis;
  origin: Coordinate;
}

export interface ShotResult {
  coordinate: Coordinate;
  isHit: boolean;
  isSunk: boolean;
  sunkShipId: string | null;
  gameOver: boolean;
  blockedCells: Coordinate[];
}

const isInsideBoard = (coordinate: Coordinate, size: number = GAME_BOARD_SIZE): boolean => {
  return (
    coordinate.row >= 0 &&
    coordinate.col >= 0 &&
    coordinate.row < size &&
    coordinate.col < size
  );
};

const keyOf = ({ row, col }: Coordinate) => `${row}:${col}`;

const makeCell = (row: number, col: number): BoardCell => ({
  row,
  col,
  state: "empty",
  shipId: null,
});

const cloneBoard = (board: BoardState): BoardState => ({
  ...board,
  cells: board.cells.map((line) => line.map((cell) => ({ ...cell }))),
  ships: board.ships.map((ship) => ({
    ...ship,
    origin: { ...ship.origin },
    cells: ship.cells.map((cell) => ({ ...cell })),
  })),
});

export const createEmptyBoard = (size: number = GAME_BOARD_SIZE): BoardState => {
  const cells: BoardCell[][] = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => makeCell(row, col)),
  );

  return {
    size,
    cells,
    ships: [],
    remainingShipCells: 0,
  };
};

export const getShipCells = ({ length, axis, origin }: PlaceShipInput): Coordinate[] => {
  return Array.from({ length }, (_, offset) => ({
    row: axis === "horizontal" ? origin.row : origin.row + offset,
    col: axis === "horizontal" ? origin.col + offset : origin.col,
  }));
};

export const canPlaceShip = (board: BoardState, input: PlaceShipInput): boolean => {
  const shipCells = getShipCells(input);

  for (const cell of shipCells) {
    if (!isInsideBoard(cell, board.size)) {
      return false;
    }

    const boardCell = board.cells[cell.row][cell.col];
    if (boardCell.state !== "empty" || boardCell.shipId !== null) {
      return false;
    }

    for (const delta of ALL_DIRECTIONS) {
      const neighbor = {
        row: cell.row + delta.row,
        col: cell.col + delta.col,
      };

      if (!isInsideBoard(neighbor, board.size)) {
        continue;
      }

      const neighborCell = board.cells[neighbor.row][neighbor.col];
      if (neighborCell.shipId !== null) {
        return false;
      }
    }
  }

  return true;
};

export const placeShip = (board: BoardState, input: PlaceShipInput): BoardState => {
  if (!canPlaceShip(board, input)) {
    throw new Error("Invalid ship placement: overlap/touching/out of bounds.");
  }

  const nextBoard = cloneBoard(board);
  const shipCells = getShipCells(input);
  const shipId = input.id ?? `ship_${nextBoard.ships.length + 1}`;

  for (const cell of shipCells) {
    nextBoard.cells[cell.row][cell.col].state = "ship";
    nextBoard.cells[cell.row][cell.col].shipId = shipId;
  }

  const ship: ShipPlacement = {
    id: shipId,
    length: input.length,
    axis: input.axis,
    origin: { ...input.origin },
    cells: shipCells,
    hits: 0,
    isSunk: false,
  };

  nextBoard.ships.push(ship);
  nextBoard.remainingShipCells += input.length;

  return nextBoard;
};

export const clearBoardShips = (board: BoardState): BoardState => {
  return createEmptyBoard(board.size);
};

export const placeFleetRandomly = (
  size: number = GAME_BOARD_SIZE,
  maxAttempts = 3_000,
): BoardState => {
  let board = createEmptyBoard(size);
  let shipCounter = 1;

  const fleet: ShipLength[] = Object.entries(GAME_FLEET_CONFIG).flatMap(([length, count]) =>
    Array.from({ length: count }, () => Number(length) as ShipLength),
  );

  for (const length of fleet) {
    let placed = false;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const axis: Axis = Math.random() < 0.5 ? "horizontal" : "vertical";
      const origin: Coordinate = {
        row: Math.floor(Math.random() * size),
        col: Math.floor(Math.random() * size),
      };

      if (!canPlaceShip(board, { length, axis, origin })) {
        continue;
      }

      board = placeShip(board, {
        id: `ship_${shipCounter}`,
        length,
        axis,
        origin,
      });

      shipCounter += 1;
      placed = true;
      break;
    }

    if (!placed) {
      throw new Error("Could not place fleet randomly within attempts limit.");
    }
  }

  return board;
};

export const validateFleet = (board: BoardState): boolean => {
  const counts = new Map<ShipLength, number>([
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ]);

  const seen = new Set<string>();

  for (const ship of board.ships) {
    counts.set(ship.length as ShipLength, (counts.get(ship.length as ShipLength) ?? 0) + 1);

    for (const cell of ship.cells) {
      if (!isInsideBoard(cell, board.size)) {
        return false;
      }

      const k = keyOf(cell);
      if (seen.has(k)) {
        return false;
      }

      seen.add(k);

      const boardCell = board.cells[cell.row][cell.col];
      if (boardCell.shipId !== ship.id) {
        return false;
      }

      for (const delta of ALL_DIRECTIONS) {
        const neighbor = { row: cell.row + delta.row, col: cell.col + delta.col };
        if (!isInsideBoard(neighbor, board.size)) {
          continue;
        }

        const neighborCell = board.cells[neighbor.row][neighbor.col];
        if (neighborCell.shipId === null || neighborCell.shipId === ship.id) {
          continue;
        }

        return false;
      }
    }
  }

  return (
    counts.get(4) === GAME_FLEET_CONFIG[4] &&
    counts.get(3) === GAME_FLEET_CONFIG[3] &&
    counts.get(2) === GAME_FLEET_CONFIG[2] &&
    counts.get(1) === GAME_FLEET_CONFIG[1]
  );
};

const markBlockedAroundSunkShip = (board: BoardState, ship: ShipPlacement): Coordinate[] => {
  const blocked: Coordinate[] = [];

  for (const cell of ship.cells) {
    for (const delta of ALL_DIRECTIONS) {
      const neighbor: Coordinate = {
        row: cell.row + delta.row,
        col: cell.col + delta.col,
      };

      if (!isInsideBoard(neighbor, board.size)) {
        continue;
      }

      const n = board.cells[neighbor.row][neighbor.col];
      if (n.state === "empty" && n.shipId === null) {
        n.state = "blocked";
        blocked.push(neighbor);
      }
    }
  }

  return blocked;
};

export const fireAt = (
  board: BoardState,
  coordinate: Coordinate,
): { board: BoardState; result: ShotResult } => {
  if (!isInsideBoard(coordinate, board.size)) {
    throw new Error("Shot is outside of board.");
  }

  const next = cloneBoard(board);
  const cell = next.cells[coordinate.row][coordinate.col];

  if (cell.state === "hit" || cell.state === "miss" || cell.state === "blocked") {
    return {
      board: next,
      result: {
        coordinate,
        isHit: cell.state === "hit",
        isSunk: false,
        sunkShipId: null,
        gameOver: next.remainingShipCells === 0,
        blockedCells: [],
      },
    };
  }

  if (cell.shipId === null) {
    cell.state = "miss";

    return {
      board: next,
      result: {
        coordinate,
        isHit: false,
        isSunk: false,
        sunkShipId: null,
        gameOver: next.remainingShipCells === 0,
        blockedCells: [],
      },
    };
  }

  cell.state = "hit";
  next.remainingShipCells -= 1;

  const ship = next.ships.find((item) => item.id === cell.shipId);
  if (!ship) {
    throw new Error("Ship referenced by cell was not found.");
  }

  ship.hits += 1;
  const sunk = ship.hits >= ship.length;
  ship.isSunk = sunk;

  const blockedCells = sunk ? markBlockedAroundSunkShip(next, ship) : [];

  return {
    board: next,
    result: {
      coordinate,
      isHit: true,
      isSunk: sunk,
      sunkShipId: sunk ? ship.id : null,
      gameOver: next.remainingShipCells === 0,
      blockedCells,
    },
  };
};

export const hasWon = (board: BoardState): boolean => board.remainingShipCells <= 0;

export const getOrthogonalNeighbors = (
  coordinate: Coordinate,
  size: number = GAME_BOARD_SIZE,
): Coordinate[] => {
  return ORTHOGONAL_DIRECTIONS.map((delta) => ({
    row: coordinate.row + delta.row,
    col: coordinate.col + delta.col,
  })).filter((cell) => isInsideBoard(cell, size));
};

export const removeShip = (board: BoardState, shipId: string): BoardState => {
  const remainingShips = board.ships.filter((s) => s.id !== shipId);
  let nextBoard = createEmptyBoard(board.size);

  for (const ship of remainingShips) {
    nextBoard = placeShip(nextBoard, {
      id: ship.id,
      length: ship.length as ShipLength,
      axis: ship.axis,
      origin: ship.origin,
    });
  }

  return nextBoard;
};
