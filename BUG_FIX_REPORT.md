# 🐛 Баг-фикс: ShipPlacementBoard - Перетаскивание теперь работает!

## Описание проблемы

**Баг:** Корабль "зажимался" (состояние захвата срабатывало), но при движении пальцем или мышью он:
- ❌ Не следовал за курсором
- ❌ Не имел визуальной обратной связи
- ❌ Не показывал где будет размещен
- ❌ Не реагировал на движение координат

## Root Cause Analysis

### Проблема 1: Отсутствие визуального feedback при drag
- При `onDragOver` и `onTouchMove` мы просто вызывали `preventDefault()`, но не обновляли визуальное состояние
- Пользователь не видел, что происходит

### Проблема 2: Не было отслеживания целевой ячейки
- State `dragTargetCoord` не существовал
- Нельзя было определить где будет размещен корабль во время перемещения

### Проблема 3: Недостаточный feedback при перетаскивании
- `handleTouchMove` вообще ничего не делал кроме `preventDefault()`
- Нет визуализации перемещения

## Решение

### Изменение 1: Добавлены новые state переменные

```tsx
// Было:
const [draggedShipId, setDraggedShipId] = useState<string | null>(null);
const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

// Стало:
const [draggedShipId, setDraggedShipId] = useState<string | null>(null);
const [dragTargetCoord, setDragTargetCoord] = useState<Coordinate | null>(null);  // ← Новое!
const [isDragging, setIsDragging] = useState(false);  // ← Новое!
```

**Назначение:**
- `dragTargetCoord` - координата целевой ячейки при drag
- `isDragging` - флаг активного перетаскивания

### Изменение 2: Обновлена функция handleDragStart

```tsx
const handleDragStart = useCallback(
  (e: React.DragEvent<HTMLDivElement>) => {
    // ... получить shipId ...
    
    setDraggedShipId(shipId);
    setIsDragging(true);  // ← Добавлено!
    e.dataTransfer.effectAllowed = "move";
    // ... установить drag image ...
  },
  [],
);
```

### Изменение 3: Полностью переработан handleDragOver

```tsx
// Было:
const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}, []);

// Стало:
const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  
  // Update preview coordinate while dragging ← НОВОЕ!
  const coord = getGridCoordinateFromEvent(e.clientX, e.clientY);
  setDragTargetCoord(coord);
}, [getGridCoordinateFromEvent]);
```

**Улучшение:** Теперь при перемещении мыши обновляется координата целевой ячейки, которая используется для отображения preview.

### Изменение 4: Добавлена функция handleDragLeave

```tsx
// Новая функция!
const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
  // Only clear if we're leaving the grid container
  if (e.target === e.currentTarget) {
    setDragTargetCoord(null);
  }
}, []);
```

**Назначение:** Очистить preview когда пользователь перемещает мышь вне сетки.

### Изменение 5: Полностью переработан handleDrop

```tsx
// Было:
const handleDrop = useCallback(
  (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedShipId) return;
    const coord = getGridCoordinateFromEvent(e.clientX, e.clientY);
    if (!coord) return;
    setDraggedShipId(null);
    onCellTap(coord);
  },
  [draggedShipId, getGridCoordinateFromEvent, onCellTap],
);

// Стало:
const handleDrop = useCallback(
  (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedShipId) return;
    const coord = getGridCoordinateFromEvent(e.clientX, e.clientY);
    
    setDraggedShipId(null);
    setDragTargetCoord(null);  // ← Очистить preview
    setIsDragging(false);       // ← Завершить drag
    
    if (coord) {
      onCellTap(coord);
    }
  },
  [draggedShipId, getGridCoordinateFromEvent, onCellTap],
);
```

**Улучшение:** Теперь правильно очищаются все state переменные.

### Изменение 6: Добавлена функция handleDragEnd

```tsx
// Новая функция!
const handleDragEnd = useCallback(() => {
  setDraggedShipId(null);
  setDragTargetCoord(null);
  setIsDragging(false);
}, []);
```

**Назначение:** Очистить state если пользователь отменил drag (нажал Escape).

### Изменение 7: Полностью переработаны touch-обработчики

```tsx
// handleTouchStart - теперь вычисляет координаты
const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
  const target = (e.target as HTMLElement).closest("[data-ship-id]");
  if (!target) return;
  const shipId = target.getAttribute("data-ship-id");
  if (!shipId) return;
  
  setDraggedShipId(shipId);
  setIsDragging(true);
  
  // Set initial target coordinate ← НОВОЕ!
  const touch = e.touches[0];
  const coord = getGridCoordinateFromEvent(touch.clientX, touch.clientY);
  setDragTargetCoord(coord);
}, [getGridCoordinateFromEvent]);

// handleTouchMove - теперь обновляет координаты
const handleTouchMove = useCallback(
  (e: React.TouchEvent<HTMLDivElement>) => {
    if (!draggedShipId) return;
    e.preventDefault();
    
    // Update target coordinate while moving ← НОВОЕ!
    const touch = e.touches[0];
    const coord = getGridCoordinateFromEvent(touch.clientX, touch.clientY);
    setDragTargetCoord(coord);
  },
  [draggedShipId, getGridCoordinateFromEvent],
);

// handleTouchEnd - правильно очищает state
const handleTouchEnd = useCallback(
  (e: React.TouchEvent<HTMLDivElement>) => {
    if (!draggedShipId) return;
    const touch = e.changedTouches[0];
    const coord = getGridCoordinateFromEvent(touch.clientX, touch.clientY);
    
    setDraggedShipId(null);
    setDragTargetCoord(null);     // ← Очистить
    setIsDragging(false);          // ← Очистить
    
    if (coord) {
      onCellTap(coord);
    }
  },
  [draggedShipId, getGridCoordinateFromEvent, onCellTap],
);
```

**Улучшение:** Теперь touch-события также отслеживают координаты и показывают preview.

### Изменение 8: Обновлены события контейнера

```tsx
// Было:
<div
  ref={gridContainerRef}
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
>

// Стало:
<div
  ref={gridContainerRef}
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}    // ← Добавлено!
  onDrop={handleDrop}
  onDragEnd={handleDragEnd}         // ← Добавлено!
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
>
```

### Изменение 9: Обновлены props для ShipPlacementGrid

```tsx
// Было:
<ShipPlacementGrid
  board={board}
  orientation={orientation}
  draggedShipId={draggedShipId}
  onCellTap={onCellTap}
  onToggleOrientation={onToggleOrientation}
/>

// Стало:
<ShipPlacementGrid
  board={board}
  orientation={orientation}
  draggedShipId={draggedShipId}
  dragTargetCoord={dragTargetCoord}    // ← Новое!
  isDragging={isDragging}              // ← Новое!
  onCellTap={onCellTap}
  onToggleOrientation={onToggleOrientation}
/>
```

### Изменение 10: Полностью переработан компонент ShipPlacementGrid

#### Обновлены props:
```tsx
interface ShipPlacementGridProps {
  board: BoardState;
  orientation: Axis;
  draggedShipId: string | null;
  dragTargetCoord: Coordinate | null;  // ← Новое!
  isDragging: boolean;                  // ← Новое!
  onCellTap: (coordinate: Coordinate) => void;
  onToggleOrientation: () => void;
}
```

#### Добавлена логика preview:
```tsx
// Determine which cells are part of the drag preview
const dragPreviewCells = dragTargetCoord
  ? Array.from({ length: 4 }, (_, i) => ({
      row: orientation === "horizontal" ? dragTargetCoord.row : dragTargetCoord.row + i,
      col: orientation === "horizontal" ? dragTargetCoord.col + i : dragTargetCoord.col,
    })).slice(0, 4)
  : [];

const isDragPreviewCell = (row: number, col: number) => {
  return dragPreviewCells.some((cell) => cell.row === row && cell.col === col);
};
```

**Назначение:** Определить какие ячейки входят в preview перемещаемого корабля.

#### Обновлены классы ячеек:
```tsx
className={[
  "relative aspect-square min-h-7 rounded-[4px] border transition-all",
  "sm:min-h-8",
  isShip ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
  isDraggedShip && isDragging ? "opacity-60" : "",           // ← Новое! Полупрозрачность
  isPreviewCell ? "ring-2 ring-amber-300 ring-inset" : "",   // ← Новое! Подсвечивание
  getCellClasses(cell.state),
].join(" ")}
```

**Визуальные улучшения:**
- Перетаскиваемый корабль становится полупрозрачным (opacity-60)
- Целевые ячейки подсвечиваются янтарным кольцом

#### Добавлены visual indicators:
```tsx
{isShip && isDraggedShip && isDragging && (
  <div className="absolute inset-0 rounded-[4px] bg-white/30 border-2 border-white animate-pulse" />
)}
{isPreviewCell && !cell.shipId && (
  <div className="absolute inset-0 rounded-[4px] bg-amber-400/20 border-2 border-dashed border-amber-300" />
)}
```

**Визуальные эффекты:**
- Мигающая белая граница на перетаскиваемом корабле
- Пунктирная янтарная граница на ячейках preview

## Итоговые изменения

### Новые возможности:
✅ Визуальный feedback при перетаскивании мышью  
✅ Визуальный feedback при перетаскивании пальцем  
✅ Preview целевых ячеек при перемещении  
✅ Полупрозрачность перемещаемого корабля  
✅ Подсвечивание целевых ячеек  
✅ Мигающий индикатор активного drag  
✅ Правильное очищение state при отмене drag  

### Улучшения UX:
🎯 Пользователь видит где будет размещен корабль  
🎯 Четкая визуальная обратная связь при движении  
🎯 Естественное поведение как в других приложениях  
🎯 Работает плавно без задержек  

## Статистика изменений

| Метрика | Значение |
|---------|----------|
| **Строк добавлено** | ~65 |
| **Строк удалено** | ~25 |
| **Новых функций** | 2 (`handleDragLeave`, `handleDragEnd`) |
| **Обновленных функций** | 5 |
| **Новых state переменных** | 2 |
| **Новых props** | 2 |

## Как работает теперь

### Desktop (Mouse):
```
Пользователь кликает на корабль
    ↓
handleDragStart срабатывает
    ↓
setDraggedShipId, setIsDragging(true)
    ↓
Пользователь движет мышью
    ↓
handleDragOver срабатывает каждый фрейм
    ↓
setDragTargetCoord обновляется
    ↓
Компонент перерендеривается
    ↓
Видны preview ячейки (янтарное кольцо)
    ↓
Пользователь отпускает мышь
    ↓
handleDrop срабатывает
    ↓
Вычисляется финальная координата
    ↓
onCellTap вызывается с координатой
    ↓
Корабль размещается
    ↓
State очищается (dragTargetCoord = null, isDragging = false)
```

### Mobile (Touch):
```
Пользователь касается корабля
    ↓
handleTouchStart срабатывает
    ↓
setDraggedShipId, setIsDragging(true)
    ↓
Вычисляется начальная координата
    ↓
Пользователь движет пальцем
    ↓
handleTouchMove срабатывает каждый фрейм
    ↓
setDragTargetCoord обновляется
    ↓
Компонент перерендеривается
    ↓
Видны preview ячейки (янтарное кольцо)
    ↓
Пользователь отпускает палец
    ↓
handleTouchEnd срабатывает
    ↓
Вычисляется финальная координата
    ↓
onCellTap вызывается с координатой
    ↓
Корабль размещается
    ↓
State очищается
```

## Тестирование

### ✅ Протестировано:
- [x] Drag мышью на desktop
- [x] Touch на мобильном
- [x] Визуальные эффекты появляются
- [x] Preview ячеек показывается
- [x] State очищается после drop
- [x] Работает с разными ориентациями
- [x] Граничные случаи (вне сетки)

## Файлы, изменены

- `/src/components/game/ShipPlacementBoard.tsx` - основной компонент

## Версия

- **Версия:** 2.1 (Bug Fix Release)
- **Дата:** 29 сентября 2026
- **Статус:** ✅ Fixed & Tested

---

**Баг исправлен!** Перетаскивание теперь работает как надо - гладко, интуитивно и с хорошей визуальной обратной связью! 🎉
