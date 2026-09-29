import { ORTHOGONAL_DIRECTIONS } from "@/lib/game/constants";
import type { AIState, Axis, BoardState, Coordinate, Difficulty, TargetState } from "@/types/game";

type ShipLength = 1 | 2 | 3 | 4;

export interface AIStepInput {
  aiState: AIState;
  enemyBoard: BoardState;
}

export interface AIStepResult {
  coordinate: Coordinate;
  nextState: AIState;
}

export interface AIShotFeedback {
  coordinate: Coordinate;
  isHit: boolean;
  isSunk: boolean;
  sunkShipLength?: ShipLength;
}

const keyOf = (coordinate: Coordinate) => `${coordinate.row}:${coordinate.col}`;

const isInside = (c: Coordinate, size: number): boolean => {
  return c.row >= 0 && c.col >= 0 && c.row < size && c.col < size;
};

const normalizeCoordinate = (coordinate: Coordinate): Coordinate => ({
  row: coordinate.row,
  col: coordinate.col,
});

const hasVisited = (aiState: AIState, coordinate: Coordinate): boolean => {
  const key = keyOf(coordinate);
  return aiState.visited.some((item) => keyOf(item) === key);
};

const isShootable = (aiState: AIState, board: BoardState, coordinate: Coordinate): boolean => {
  if (!isInside(coordinate, board.size)) {
    return false;
  }

  if (hasVisited(aiState, coordinate)) {
    return false;
  }

  const cell = board.cells[coordinate.row][coordinate.col];
  return cell.state !== "miss" && cell.state !== "hit" && cell.state !== "blocked";
};

const listShootableCells = (aiState: AIState, board: BoardState): Coordinate[] => {
  const cells: Coordinate[] = [];

  for (let row = 0; row < board.size; row += 1) {
    for (let col = 0; col < board.size; col += 1) {
      const coordinate = { row, col };
      if (isShootable(aiState, board, coordinate)) {
        cells.push(coordinate);
      }
    }
  }

  return cells;
};

const randomFrom = <T>(items: T[]): T => {
  if (items.length === 0) {
    throw new Error("Attempt to pick random item from empty array.");
  }

  return items[Math.floor(Math.random() * items.length)];
};

const removeDuplicateCoordinates = (coords: Coordinate[]): Coordinate[] => {
  const seen = new Set<string>();
  const unique: Coordinate[] = [];

  for (const cell of coords) {
    const key = keyOf(cell);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(cell);
  }

  return unique;
};

const collectConnectedHits = (board: BoardState, start: Coordinate): Coordinate[] => {
  const queue: Coordinate[] = [start];
  const visited = new Set<string>([keyOf(start)]);
  const component: Coordinate[] = [];

  while (queue.length > 0) {
    const current = queue.shift() as Coordinate;
    const cell = board.cells[current.row][current.col];
    if (cell.state !== "hit") {
      continue;
    }

    component.push(current);

    for (const delta of ORTHOGONAL_DIRECTIONS) {
      const next = {
        row: current.row + delta.row,
        col: current.col + delta.col,
      };

      if (!isInside(next, board.size)) {
        continue;
      }

      const nextKey = keyOf(next);
      if (visited.has(nextKey)) {
        continue;
      }

      visited.add(nextKey);

      if (board.cells[next.row][next.col].state === "hit") {
        queue.push(next);
      }
    }
  }

  return component;
};

const inferAxisFromHits = (hits: Coordinate[]): Axis | null => {
  if (hits.length < 2) {
    return null;
  }

  const sameRow = hits.every((h) => h.row === hits[0].row);
  if (sameRow) {
    return "horizontal";
  }

  const sameCol = hits.every((h) => h.col === hits[0].col);
  if (sameCol) {
    return "vertical";
  }

  return null;
};

const getAxisEndpoints = (hits: Coordinate[], axis: Axis): { min: Coordinate; max: Coordinate } => {
  if (axis === "horizontal") {
    const sorted = [...hits].sort((a, b) => a.col - b.col);
    return { min: sorted[0], max: sorted[sorted.length - 1] };
  }

  const sorted = [...hits].sort((a, b) => a.row - b.row);
  return { min: sorted[0], max: sorted[sorted.length - 1] };
};

const buildQueueAroundHit = (
  aiState: AIState,
  board: BoardState,
  coordinate: Coordinate,
): Coordinate[] => {
  const candidates = ORTHOGONAL_DIRECTIONS.map((delta) => ({
    row: coordinate.row + delta.row,
    col: coordinate.col + delta.col,
  })).filter((item) => isShootable(aiState, board, item));

  return removeDuplicateCoordinates(candidates);
};

const buildQueueByAxis = (
  aiState: AIState,
  board: BoardState,
  hits: Coordinate[],
  axis: Axis,
): Coordinate[] => {
  const { min, max } = getAxisEndpoints(hits, axis);

  const before =
    axis === "horizontal"
      ? { row: min.row, col: min.col - 1 }
      : { row: min.row - 1, col: min.col };
  const after =
    axis === "horizontal"
      ? { row: max.row, col: max.col + 1 }
      : { row: max.row + 1, col: max.col };

  return [before, after].filter((item) => isShootable(aiState, board, item));
};

const getTargetShot = (aiState: AIState, board: BoardState): Coordinate | null => {
  const target = aiState.targetState;
  if (!target) {
    return null;
  }

  const queue = target.queued.filter((item) => isShootable(aiState, board, item));
  if (queue.length === 0) {
    return null;
  }

  return queue[0];
};

const pickRandomShot = (aiState: AIState, board: BoardState): Coordinate => {
  const candidates = listShootableCells(aiState, board);
  if (candidates.length === 0) {
    throw new Error("No shootable cells left.");
  }

  return randomFrom(candidates);
};

const createProbabilityMap = (aiState: AIState, board: BoardState): number[][] => {
  const map = Array.from({ length: board.size }, () => Array.from({ length: board.size }, () => 0));

  const fitsPlacement = (cells: Coordinate[]): boolean => {
    for (const c of cells) {
      if (!isInside(c, board.size)) {
        return false;
      }

      const cell = board.cells[c.row][c.col];
      if (cell.state === "miss" || cell.state === "blocked") {
        return false;
      }
    }

    return true;
  };

  for (const length of aiState.remainingEnemyShips) {
    for (let row = 0; row < board.size; row += 1) {
      for (let col = 0; col < board.size; col += 1) {
        const horizontal = Array.from({ length }, (_, offset) => ({ row, col: col + offset }));
        const vertical = Array.from({ length }, (_, offset) => ({ row: row + offset, col }));

        for (const placement of [horizontal, vertical]) {
          if (!fitsPlacement(placement)) {
            continue;
          }

          for (const c of placement) {
            if (!isShootable(aiState, board, c)) {
              continue;
            }

            map[c.row][c.col] += 1;
          }
        }
      }
    }
  }

  return map;
};

const pickHardHuntShot = (aiState: AIState, board: BoardState): Coordinate => {
  const candidates = listShootableCells(aiState, board);
  if (candidates.length === 0) {
    throw new Error("No shootable cells left.");
  }

  const map = createProbabilityMap(aiState, board);
  let bestScore = -1;
  let best: Coordinate[] = [];

  for (const cell of candidates) {
    const score = map[cell.row][cell.col];
    if (score > bestScore) {
      bestScore = score;
      best = [cell];
      continue;
    }

    if (score === bestScore) {
      best.push(cell);
    }
  }

  if (best.length === 0 || bestScore <= 0) {
    return randomFrom(candidates);
  }

  return randomFrom(best);
};

const withVisited = (aiState: AIState, coordinate: Coordinate): AIState => {
  if (hasVisited(aiState, coordinate)) {
    return aiState;
  }

  return {
    ...aiState,
    visited: [...aiState.visited, normalizeCoordinate(coordinate)],
  };
};

export const chooseEasyShot = ({ aiState, enemyBoard }: AIStepInput): AIStepResult => {
  const coordinate = pickRandomShot(aiState, enemyBoard);
  return {
    coordinate,
    nextState: withVisited(aiState, coordinate),
  };
};

export const chooseMediumShot = ({ aiState, enemyBoard }: AIStepInput): AIStepResult => {
  const targetShot = getTargetShot(aiState, enemyBoard);
  const coordinate = targetShot ?? pickRandomShot(aiState, enemyBoard);

  return {
    coordinate,
    nextState: withVisited(aiState, coordinate),
  };
};

export const chooseHardShot = ({ aiState, enemyBoard }: AIStepInput): AIStepResult => {
  const targetShot = getTargetShot(aiState, enemyBoard);
  const coordinate = targetShot ?? pickHardHuntShot(aiState, enemyBoard);

  return {
    coordinate,
    nextState: withVisited(aiState, coordinate),
  };
};

const removeSunkLength = (lengths: ShipLength[], sunkLength?: ShipLength): ShipLength[] => {
  if (!sunkLength) {
    return lengths;
  }

  const index = lengths.indexOf(sunkLength);
  if (index === -1) {
    return lengths;
  }

  return [...lengths.slice(0, index), ...lengths.slice(index + 1)];
};

const rebuildTargetStateFromHit = (
  aiState: AIState,
  enemyBoard: BoardState,
  latestHit: Coordinate,
): TargetState => {
  const cluster = collectConnectedHits(enemyBoard, latestHit);
  const axis = inferAxisFromHits(cluster);

  if (!axis) {
    return {
      originHit: normalizeCoordinate(cluster[0] ?? latestHit),
      queued: buildQueueAroundHit(aiState, enemyBoard, latestHit),
      confirmedAxis: null,
      tried: removeDuplicateCoordinates(cluster),
    };
  }

  return {
    originHit: normalizeCoordinate(cluster[0] ?? latestHit),
    queued: buildQueueByAxis(aiState, enemyBoard, cluster, axis),
    confirmedAxis: axis,
    tried: removeDuplicateCoordinates(cluster),
  };
};

export const applyAIShotFeedback = (
  aiState: AIState,
  enemyBoard: BoardState,
  feedback: AIShotFeedback,
): AIState => {
  const withVisit = withVisited(aiState, feedback.coordinate);

  if (!feedback.isHit) {
    if (!withVisit.targetState) {
      return withVisit;
    }

    const filteredQueue = withVisit.targetState.queued.filter(
      (item) => keyOf(item) !== keyOf(feedback.coordinate) && isShootable(withVisit, enemyBoard, item),
    );

    return {
      ...withVisit,
      targetState: filteredQueue.length
        ? {
            ...withVisit.targetState,
            queued: filteredQueue,
          }
        : null,
    };
  }

  if (feedback.isSunk) {
    return {
      ...withVisit,
      targetState: null,
      remainingEnemyShips: removeSunkLength(withVisit.remainingEnemyShips as ShipLength[], feedback.sunkShipLength),
    };
  }

  return {
    ...withVisit,
    targetState: rebuildTargetStateFromHit(withVisit, enemyBoard, feedback.coordinate),
  };
};

export const chooseAIShot = (input: AIStepInput): AIStepResult => {
  const difficulty: Difficulty = input.aiState.difficulty;

  if (difficulty === "easy") {
    return chooseEasyShot(input);
  }

  if (difficulty === "medium") {
    return chooseMediumShot(input);
  }

  return chooseHardShot(input);
};
