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
  onRemoveShip?: (shipId: string) => void;
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
  onRemoveShip,
}: ShipPlacementBoardProps) {
  const allPlaced = Object.values(remainingByLength).every((n) => n === 0);
  const [draggedShipId, setDraggedShipId] = useState<string | null>(null);
  const [hoverCoord, setHoverCoord] = useState<Coordinate | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Клик по клетке:
  // Если на клетке уже есть корабль -> удаляем его и выбираем его размер для дальнейшей установки
  // Если клетка пустая -> пытаемся поставить выбранный корабль
  const handleCellClick = useCallback(
    (coord: Coordinate, cellShipId?: string) => {
      if (cellShipId) {
        const existingShip = board.ships?.find((s) => s.id === cellShipId);
        if (existingShip) {
          onSelectLength(existingShip.length as ShipLength);
        }
        if (onRemoveShip) {
          onRemoveShip(cellShipId);
        }
        return;
      }

      // Если корабли выбранного типа закончились, берем первый доступный из остатков
      if (remainingByLength[selectedShipLength] === 0) {
        const availableLength = lengths.find((l) => remainingByLength[l] > 0);
        if (availableLength) {
          onSelectLength(availableLength);
        }
      }

      onCellTap(coord);
    },
    [board.ships, onRemoveShip, onSelectLength, remainingByLength, selectedShipLength, onCellTap],
  );

  const getGridCoordinateFromEvent = useCallback(
    (clientX: number, clientY: number): Coordinate | null => {
      if (!gridContainerRef.current) return null;

      const rect = gridContainerRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const relY = clientY - rect.top;

      const padding = 8;
      const gridWidth = rect.width - 2 * padding;
      const gridHeight = rect.height - 2 * padding;

      const gap = 4;
      const cellsPerRow = board.size;

      const totalGapWidth = gap * (cellsPerRow - 1);
      const cellWidth = (gridWidth - totalGapWidth) / cellsPerRow;
      const cellHeight = (gridHeight - totalGapWidth) / board.size;

      const adjustedX = relX - padding;
      const adjustedY = relY - padding;

      let col = Math.floor(adjustedX / (cellWidth + gap));
      let row = Math.floor(adjustedY / (cellHeight + gap));

      if (col < 0) col = 0;
      if (col >= cellsPerRow) col = cellsPerRow - 1;
      if (row < 0) row = 0;
      if (row >= board.size) row = board.size - 1;

      return { row, col };
    },
    [board.size],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const target = (e.target as HTMLElement).closest("[data-ship-id]");
      if (target) {
        const shipId = target.getAttribute("data-ship-id");
        if (shipId) {
          setDraggedShipId(shipId);
          e.dataTransfer.setData("text/plain", shipId);
          const ship = board.ships?.find((s) => s.id === shipId);
          if (ship) {
            onSelectLength(ship.length as ShipLength);
          }
        }
      }

      setIsDragging(true);
      e.dataTransfer.effectAllowed = "move";

      const img = new Image();
      img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      e.dataTransfer.setDragImage(img, 0, 0);
    },
    [board.ships, onSelectLength],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const coord = getGridCoordinateFromEvent(e.clientX, e.clientY);
      if (coord) {
        setHoverCoord(coord);
      }
    },
    [getGridCoordinateFromEvent],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const dropShipId = e.dataTransfer.getData("text/plain") || draggedShipId;
      const coord = getGridCoordinateFromEvent(e.clientX, e.clientY) || hoverCoord;

      if (dropShipId && onRemoveShip) {
        const ship = board.ships?.find((s) => s.id === dropShipId);
        if (ship) {
          onSelectLength(ship.length as ShipLength);
        }
        onRemoveShip(dropShipId);
      }

      if (coord) {
        onCellTap(coord);
      }

      setDraggedShipId(null);
      setIsDragging(false);
      setHoverCoord(null);
    },
    [draggedShipId, getGridCoordinateFromEvent, hoverCoord, onRemoveShip, board.ships, onSelectLength, onCellTap],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedShipId(null);
    setHoverCoord(null);
    setIsDragging(false);
  }, []);

  return (
    <section className="flex w-full flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-ocean-200">Расстановка флота</h2>
        <p className="text-sm text-slate-300">
          Нажмите на корабль, чтобы удалить его и сразу же поставить в новое место.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(["easy", "medium", "hard"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onChangeDifficulty(value)}
            className={[
              "rounded-xl border px-3 py-2 text-sm font-medium transition capitalize",
              difficulty === value
                ? "border-ocean-300 bg-ocean-500/20 text-ocean-100"
                : "border-slate-700 bg-slate-800/80 text-slate-300",
            ].join(" ")}
          >
            {value}
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
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        className="select-none"
      >
        <ShipPlacementGrid
          board={board}
          orientation={orientation}
          selectedShipLength={selectedShipLength}
          draggedShipId={draggedShipId}
          hoverCoord={hoverCoord}
          isDragging={isDragging}
          onCellClick={handleCellClick}
          setHoverCoord={setHoverCoord}
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
  hoverCoord: Coordinate | null;
  isDragging: boolean;
  onCellClick: (coord: Coordinate, shipId?: string) => void;
  setHoverCoord: (coord: Coordinate | null) => void;
}

function ShipPlacementGrid({
  board,
  orientation,
  selectedShipLength,
  draggedShipId,
  hoverCoord,
  isDragging,
  onCellClick,
  setHoverCoord,
}: ShipPlacementGridProps) {
  const getCellClasses = (state: BoardState["cells"][number][number]["state"]) => {
    if (state === "hit") return "bg-rose-500/90 border-rose-300";
    if (state === "miss" || state === "blocked") return "bg-slate-700/80 border-slate-600";
    if (state === "ship") return "bg-ocean-500/90 border-ocean-300 cursor-grab active:cursor-grabbing";
    return "bg-ocean-950 border-ocean-900";
  };

  const hoverPreviewCells = hoverCoord
    ? Array.from({ length: selectedShipLength }, (_, i) => ({
        row: orientation === "horizontal" ? hoverCoord.row : hoverCoord.row + i,
        col: orientation === "horizontal" ? hoverCoord.col + i : hoverCoord.col,
      })).filter((c) => c.row >= 0 && c.row < board.size && c.col >= 0 && c.col < board.size)
    : [];

  const isHoverPreviewCell = (row: number, col: number) => {
    return hoverPreviewCells.some((cell) => cell.row === row && cell.col === col);
  };

  return (
    <div className="mx-auto w-full max-w-[min(92vw,460px)]">
      <div
        className="grid gap-1 rounded-xl border border-slate-700 bg-slate-900/70 p-2"
        style={{ gridTemplateColumns: `repeat(${board.size}, minmax(0, 1fr))` }}
        onMouseLeave={() => setHoverCoord(null)}
      >
        {board.cells.flatMap((row) =>
          row.map((cell) => {
            const isShip = cell.state === "ship";
            const isPreviewCell = isHoverPreviewCell(cell.row, cell.col);
            const isDraggedShip = draggedShipId === cell.shipId;

            return (
              <button
                key={`${cell.row}-${cell.col}`}
                type="button"
                data-ship-id={isShip ? cell.shipId : undefined}
                onClick={() => onCellClick({ row: cell.row, col: cell.col }, isShip && cell.shipId ? cell.shipId : undefined)}
                onMouseEnter={() => {
                  if (!isDragging) {
                    setHoverCoord({ row: cell.row, col: cell.col });
                  }
                }}
                draggable={isShip}
                className={[
                  "relative aspect-square min-h-7 rounded-[4px] border transition-all select-none",
                  "sm:min-h-8",
                  isShip ? "cursor-pointer" : "cursor-pointer",
                  isDraggedShip && isDragging ? "opacity-40" : "",
                  isPreviewCell ? "ring-2 ring-amber-300 ring-inset bg-amber-400/20" : "",
                  getCellClasses(cell.state),
                ].join(" ")}
                aria-label={`cell-${cell.row}-${cell.col}`}
              >
                {isPreviewCell && !isShip && (
                  <div className="pointer-events-none absolute inset-0 rounded-[4px] border-2 border-dashed border-amber-300 bg-amber-400/20" />
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}