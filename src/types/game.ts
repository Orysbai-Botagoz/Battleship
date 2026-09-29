export const BOARD_SIZE = 10 as const;

export const FLEET_CONFIG = {
  4: 1,
  3: 2,
  2: 3,
  1: 4,
} as const;

export type Difficulty = "easy" | "medium" | "hard";
export type Axis = "horizontal" | "vertical";
export type CellState = "empty" | "ship" | "hit" | "miss" | "blocked";
export type GameStatus = "placement" | "in_progress" | "won" | "lost";
export type PlayerSide = "player" | "ai";

export interface Coordinate {
  row: number;
  col: number;
}

export interface BoardCell extends Coordinate {
  state: CellState;
  shipId: string | null;
}

export interface ShipPlacement {
  id: string;
  length: 1 | 2 | 3 | 4;
  axis: Axis;
  origin: Coordinate;
  cells: Coordinate[];
  hits: number;
  isSunk: boolean;
}

export interface BoardState {
  size: number;
  cells: BoardCell[][];
  ships: ShipPlacement[];
  remainingShipCells: number;
}

export interface MoveEvent {
  turn: number;
  side: PlayerSide;
  target: Coordinate;
  isHit: boolean;
  isSunk: boolean;
  sunkShipId: string | null;
  timestamp: string;
}

export interface TargetState {
  originHit: Coordinate;
  queued: Coordinate[];
  confirmedAxis: Axis | null;
  tried: Coordinate[];
}

export interface AIState {
  difficulty: Difficulty;
  visited: Coordinate[];
  targetState: TargetState | null;
  remainingEnemyShips: Array<1 | 2 | 3 | 4>;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  gamesPlayed: number;
  currentStreak: number;
  bestStreak: number;
}

export interface GameState {
  id: string;
  status: GameStatus;
  difficulty: Difficulty;
  turn: number;
  activeSide: PlayerSide;
  playerBoard: BoardState;
  aiBoard: BoardState;
  moveHistory: MoveEvent[];
  aiState: AIState;
  createdAt: string;
  updatedAt: string;
}