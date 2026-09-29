"use client";

import { RotateCw, Shuffle, Trash2 } from "lucide-react";
import { useState, useRef, useCallback } from "react";
import type { Axis, BoardState, Coordinate, Difficulty } from "@/types/game";

type ShipLength = 1 | 2 | 3 | 4;

interface ShipPlacementBoardProps {
  board: BoardState;
  orientation: Axis;
  selectedShipLength: ShipLength;
  remainingByLength: Record<ShipLength, number>;
  difficulty: Difficulty;
  message: string;
  onSelectLength: (length: ShipLength) => void;
  onToggleOrientation: () => void;
  onAutoPlace: () => void;
  onClear: () => void;
  onCellTap: (coordinate: Coordinate) => void;
  onStartBattle: () => void;
  onChangeDifficulty: (difficulty: Difficulty) => void;
}

const lengths: ShipLength[] = [4, 3, 2, 1];

export function ShipPlacementBoard({
  board,
  orientation,
  selectedShipLength,
  remainingByLength,
  difficulty,
  message,
  onSelectLength,
  onToggleOrientation,
  onAutoPlace,
  onClear,
  onCellTap,
  onStartBattle,
  onChangeDifficulty,
}: ShipPlacementBoardProps) {
  const allPlaced = Object.values(remainingByLength).every((n) => n === 0);
  const [draggedShipId, setDraggedShipId] = useState<string | null>(null);
  const [dragTargetCoord, setDragTargetCoord] = useState<Coordinate | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const getGridCoordinateFromEvent = useCallback(
    (clientX: number, clientY: number): Coordinate | null => {
      if (!gridContainerRef.current) return null;

      const rect = gridContainerRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      // Get grid dimensions
      const containerWidth = rect.width;
      const containerHeight = rect.height;

      // Account for padding
      const padding = 8; // 2 * 4px (p-2 in Tailwind)
      const gridWidth = containerWidth - 2 * padding;
      const gridHeight = containerHeight - 2 * padding;

      // Account for gap between cells
      const gap = 4; // gap-1 = 0.25rem = 4px
      const cellsPerRow = board.size;

      const totalGapWidth = gap * (cellsPerRow - 1);
      const totalGapHeight = gap * (board.size - 1);

      const cellWidth = (gridWidth - totalGapWidth) / cellsPerRow;
      const cellHeight = (gridHeight - totalGapHeight) / board.size;

      const adjustedX = relX - padding;
      const adjustedY = relY - padding;

      let col = 0;
      let currentX = 0;

      for (let i = 0; i < cellsPerRow; i++) {
        if (adjustedX < currentX + cellWidth) {
          col = i;
          break;
        }
        currentX += cellWidth + gap;
        if (i === cellsPerRow - 1) col = cellsPerRow - 1;
      }

      let row = 0;
      let currentY = 0;

      for (let i = 0; i < board.size; i++) {
        if (adjustedY < currentY + cellHeight) {
          row = i;
          break;
        }
        currentY += cellHeight + gap;
        if (i === board.size - 1) row = board.size - 1;
      }

      if (col < 0 || col >= cellsPerRow || row < 0 || row >= board.size) {
        return null;
      }

      return { row, col };
    },
    [board.size],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest("[data-ship-id]");
      if (!target) return;

      const shipId = target.getAttribute("data-ship-id");
      if (!shipId) return;

      setDraggedShipId(shipId);
      setIsDragging(true);
      e.dataTransfer.effectAllowed = "move";

      const img = new Image();
      img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      e.dataTransfer.setDragImage(img, 0, 0);
    },
    [],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    // Update preview coordinate while dragging
    const coord = getGridCoordinateFromEvent(e.clientX, e.clientY);
    setDragTargetCoord(coord);
  }, [getGridCoordinateFromEvent]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // Only clear if we're leaving the grid container
    if (e.target === e.currentTarget) {
      setDragTargetCoord(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (!draggedShipId || !dragTargetCoord) return;

      setDraggedShipId(null);
      setIsDragging(false);

      // Use dragTargetCoord which was updated during dragOver
      onCellTap(dragTargetCoord);
      
      setDragTargetCoord(null);
    },
    [draggedShipId, dragTargetCoord, onCellTap],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedShipId(null);
    setDragTargetCoord(null);
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest("[data-ship-id]");
    if (!target) return;

    const shipId = target.getAttribute("data-ship-id");
    if (!shipId) return;

    setDraggedShipId(shipId);
    setIsDragging(true);
    
    // Set initial target coordinate
    const touch = e.touches[0];
    const coord = getGridCoordinateFromEvent(touch.clientX, touch.clientY);
    setDragTargetCoord(coord);
  }, [getGridCoordinateFromEvent]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!draggedShipId) return;
      e.preventDefault();
      
      // Update target coordinate while moving
      const touch = e.touches[0];
      const coord = getGridCoordinateFromEvent(touch.clientX, touch.clientY);
      setDragTargetCoord(coord);
    },
    [draggedShipId, getGridCoordinateFromEvent],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!draggedShipId || !dragTargetCoord) return;

      setDraggedShipId(null);
      setIsDragging(false);

      // Use dragTargetCoord which was updated during touchMove
      onCellTap(dragTargetCoord);
      
      setDragTargetCoord(null);
    },
    [draggedShipId, dragTargetCoord, onCellTap],
  );

  return (
    <section className="flex w-full flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-ocean-200">Расстановка флота</h2>
        <p className="text-sm text-slate-300">
          Способы размещения: перетащи корабль, нажми на клетку или кликай по кораблю чтобы выбрать.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {([
          ["easy", "Easy"],
          ["medium", "Medium"],
          ["hard", "Hard"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => onChangeDifficulty(value)}
            className={[
              "rounded-xl border px-3 py-2 text-sm font-medium transition",
              difficulty === value
                ? "border-ocean-300 bg-ocean-500/20 text-ocean-100"
                : "border-slate-700 bg-slate-800/80 text-slate-300",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {lengths.map((length) => {
          const remaining = remainingByLength[length];
          return (
            <button
              key={length}
              type="button"
              onClick={() => onSelectLength(length)}
              className={[
                "rounded-xl border px-3 py-2 text-left text-sm transition",
                selectedShipLength === length
                  ? "border-ocean-300 bg-ocean-500/15 text-ocean-100"
                  : "border-slate-700 bg-slate-800/70 text-slate-300",
              ].join(" ")}
            >
              <div className="font-semibold">{length}-палубный</div>
              <div className="text-xs opacity-85">Осталось: {remaining}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={onToggleOrientation}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 transition"
        >
          <RotateCw size={16} /> {orientation === "horizontal" ? "Горизонт" : "Вертикаль"}
        </button>
        <button
          type="button"
          onClick={onAutoPlace}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 transition"
        >
          <Shuffle size={16} /> Авто
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700 transition"
        >
          <Trash2 size={16} /> Очистить
        </button>
      </div>

      <div
        ref={gridContainerRef}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <ShipPlacementGrid
          board={board}
          orientation={orientation}
          selectedShipLength={selectedShipLength}
          draggedShipId={draggedShipId}
          dragTargetCoord={dragTargetCoord}
          isDragging={isDragging}
          onCellTap={onCellTap}
          onToggleOrientation={onToggleOrientation}
        />
      </div>

      <div className="space-y-2">
        <p className="min-h-5 text-sm text-amber-200">{message}</p>
        <button
          type="button"
          onClick={onStartBattle}
          className="w-full rounded-xl bg-ocean-500 px-4 py-3 text-base font-semibold text-white shadow-lg shadow-ocean-500/30 transition active:scale-[0.99]"
        >
          {allPlaced ? "Начать бой" : "Заверши расстановку"}
        </button>
      </div>
    </section>
  );
}

interface ShipPlacementGridProps {
  board: BoardState;
  orientation: Axis;
  selectedShipLength: ShipLength;
  draggedShipId: string | null;
  dragTargetCoord: Coordinate | null;
  isDragging: boolean;
  onCellTap: (coordinate: Coordinate) => void;
  onToggleOrientation: () => void;
}

function ShipPlacementGrid({
  board,
  orientation,
  selectedShipLength,
  draggedShipId,
  dragTargetCoord,
  isDragging,
  onCellTap,
  onToggleOrientation,
}: ShipPlacementGridProps) {
  const getCellClasses = (state: BoardState["cells"][number][number]["state"]) => {
    if (state === "hit") {
      return "bg-rose-500/90 border-rose-300";
    }

    if (state === "miss" || state === "blocked") {
      return "bg-slate-700/80 border-slate-600";
    }

    if (state === "ship") {
      return "bg-ocean-500/90 border-ocean-300 cursor-grab active:cursor-grabbing";
    }

    return "bg-ocean-950 border-ocean-900";
  };

  // Determine which cells are part of the drag preview
  const dragPreviewCells = dragTargetCoord && draggedShipId
    ? Array.from({ length: selectedShipLength }, (_, i) => ({
        row: orientation === "horizontal" ? dragTargetCoord.row : dragTargetCoord.row + i,
        col: orientation === "horizontal" ? dragTargetCoord.col + i : dragTargetCoord.col,
      }))
    : [];

  const isDragPreviewCell = (row: number, col: number) => {
    return dragPreviewCells.some((cell) => cell.row === row && cell.col === col);
  };

  return (
    <div className="mx-auto w-full max-w-[min(92vw,460px)]">
      <div
        className="grid gap-1 rounded-xl border border-slate-700 bg-slate-900/70 p-2"
        style={{ gridTemplateColumns: `repeat(${board.size}, minmax(0, 1fr))` }}
      >
        {board.cells.flatMap((row) =>
          row.map((cell) => {
            const isShip = cell.state === "ship";
            const isPreviewCell = isDragging && isDragPreviewCell(cell.row, cell.col);
            const isDraggedShip = draggedShipId === cell.shipId;

            return (
              <button
                key={`${cell.row}-${cell.col}`}
                type="button"
                data-ship-id={isShip ? cell.shipId : undefined}
                onClick={(e) => {
                  if (isShip) {
                    // If clicking on a ship, toggle orientation for quick adjustment
                    e.stopPropagation();
                    // Optional: You can call onToggleOrientation here or implement ship-specific rotation
                  } else {
                    // If clicking on empty cell, place ship
                    onCellTap({ row: cell.row, col: cell.col });
                  }
                }}
                draggable={isShip}
                className={[
                  "relative aspect-square min-h-7 rounded-[4px] border transition-all",
                  "sm:min-h-8",
                  isShip ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                  isDraggedShip && isDragging ? "opacity-60" : "",
                  isPreviewCell ? "ring-2 ring-amber-300 ring-inset" : "",
                  getCellClasses(cell.state),
                ].join(" ")}
                aria-label={`cell-${cell.row}-${cell.col}`}
              >
                {isShip && isDraggedShip && isDragging && (
                  <div className="absolute inset-0 rounded-[4px] bg-white/30 border-2 border-white animate-pulse" />
                )}
                {isPreviewCell && !cell.shipId && (
                  <div className="absolute inset-0 rounded-[4px] bg-amber-400/20 border-2 border-dashed border-amber-300" />
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
