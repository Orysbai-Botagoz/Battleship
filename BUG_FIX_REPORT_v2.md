# 🐛 Баг-фикс: ShipPlacementBoard - Исправлены два критических бага

## Описание проблем

### Баг 1: Неправильный размер предпросмотра
**Проблема:** Желтый контур предпросмотра (preview highlight) всегда подсвечивал 4 клетки, независимо от выбранного корабля.

**Ожидаемое поведение:** Количество подсвеченных клеток должно соответствовать длине корабля:
- 1-палубный корабль → 1 клетка
- 2-палубный корабль → 2 клетки
- 3-палубный корабль → 3 клетки
- 4-палубный корабль → 4 клетки

### Баг 2: Корабль не фиксируется при drop
**Проблема:** При отпускании корабля над сеткой (mouse drop или touch end) корабль не устанавливался и исчезал, не обновляя состояние поля.

**Ожидаемое поведение:** Корабль должен разместиться на сетке, если координаты валидны.

---

## Исправления

### Исправление 1: Размер предпросмотра

#### Проблема в коде:
```tsx
// БЫЛО - жестко закодировано length: 4
const dragPreviewCells = dragTargetCoord
  ? Array.from({ length: 4 }, (_, i) => ({
      // ...
    })).slice(0, 4)
  : [];
```

#### Решение:
**Шаг 1:** Добавить `selectedShipLength` как проп в `ShipPlacementGridProps`

```tsx
interface ShipPlacementGridProps {
  board: BoardState;
  orientation: Axis;
  selectedShipLength: ShipLength;  // ← ДОБАВЛЕНО
  draggedShipId: string | null;
  dragTargetCoord: Coordinate | null;
  isDragging: boolean;
  onCellTap: (coordinate: Coordinate) => void;
  onToggleOrientation: () => void;
}
```

**Шаг 2:** Получить `selectedShipLength` в функции компонента

```tsx
function ShipPlacementGrid({
  board,
  orientation,
  selectedShipLength,  // ← ДОБАВЛЕНО
  draggedShipId,
  dragTargetCoord,
  isDragging,
  onCellTap,
  onToggleOrientation,
}: ShipPlacementGridProps) {
```

**Шаг 3:** Обновить логику вычисления `dragPreviewCells`

```tsx
// СТАЛО - использует selectedShipLength
const dragPreviewCells = dragTargetCoord && draggedShipId
  ? Array.from({ length: selectedShipLength }, (_, i) => ({
      row: orientation === "horizontal" ? dragTargetCoord.row : dragTargetCoord.row + i,
      col: orientation === "horizontal" ? dragTargetCoord.col + i : dragTargetCoord.col,
    }))
  : [];
```

**Ключевые изменения:**
- ✅ Вместо `{ length: 4 }` → `{ length: selectedShipLength }`
- ✅ Убрана `.slice(0, 4)` (больше не нужна)
- ✅ Добавлена проверка `draggedShipId` (preview только при active drag)

**Шаг 4:** Передать `selectedShipLength` при рендеринге компонента

```tsx
<ShipPlacementGrid
  board={board}
  orientation={orientation}
  selectedShipLength={selectedShipLength}  // ← ДОБАВЛЕНО
  draggedShipId={draggedShipId}
  dragTargetCoord={dragTargetCoord}
  isDragging={isDragging}
  onCellTap={onCellTap}
  onToggleOrientation={onToggleOrientation}
/>
```

---

### Исправление 2: Фиксация корабля при drop

#### Проблема в коде:
```tsx
// БЫЛО - вычисление новых координат при drop
const handleDrop = useCallback(
  (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedShipId) return;
    
    // Проблема: вычисляем координаты ЗАНОВО вместо использования dragTargetCoord
    const coord = getGridCoordinateFromEvent(e.clientX, e.clientY);
    
    setDraggedShipId(null);
    setDragTargetCoord(null);
    setIsDragging(false);

    if (coord) {
      onCellTap(coord);
    }
  },
  [draggedShipId, getGridCoordinateFromEvent, onCellTap],
);
```

**Почему это не работало:**
1. Вычисляли `coord` в момент drop, но координаты могли быть другими
2. Иногда `coord` было `null` (вне сетки), и корабль не размещался
3. Не использовали `dragTargetCoord`, который уже был вычислен и был правильным

#### Решение:

```tsx
// СТАЛО - использует dragTargetCoord которая уже вычислена
const handleDrop = useCallback(
  (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    // Проверяем оба: shipId и координату
    if (!draggedShipId || !dragTargetCoord) return;

    setDraggedShipId(null);
    setIsDragging(false);

    // Используем dragTargetCoord которая была обновлена в handleDragOver
    onCellTap(dragTargetCoord);
    
    setDragTargetCoord(null);
  },
  [draggedShipId, dragTargetCoord, onCellTap],
);
```

**Ключевые изменения:**
- ✅ Проверяем `!dragTargetCoord` (есть ли валидная координата)
- ✅ Используем `dragTargetCoord` вместо вычисления нового `coord`
- ✅ Вызываем `onCellTap` ДО очистки `dragTargetCoord` (важно!)
- ✅ Обновляем dependency array: `[draggedShipId, dragTargetCoord, onCellTap]`

#### Аналогичное исправление для touch:

```tsx
// БЫЛО
const handleTouchEnd = useCallback(
  (e: React.TouchEvent<HTMLDivElement>) => {
    if (!draggedShipId) return;
    
    const touch = e.changedTouches[0];
    const coord = getGridCoordinateFromEvent(touch.clientX, touch.clientY);
    
    setDraggedShipId(null);
    setDragTargetCoord(null);
    setIsDragging(false);

    if (coord) {
      onCellTap(coord);
    }
  },
  [draggedShipId, getGridCoordinateFromEvent, onCellTap],
);

// СТАЛО
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
```

---

## Как это работает теперь

### Desktop (Mouse Drag)
```
1. Пользователь кликает на корабль (например, 3-палубный)
   ↓
2. handleDragStart: setDraggedShipId, setIsDragging(true)
   ↓
3. Пользователь движет мышью
   ↓
4. handleDragOver срабатывает каждый фрейм:
   - getGridCoordinateFromEvent вычисляет координату
   - setDragTargetCoord обновляет preview coordinate
   ↓
5. ShipPlacementGrid перерендеривается:
   - dragPreviewCells вычисляется на основе dragTargetCoord и selectedShipLength (3)
   - Подсвечиваются ровно 3 ячейки (не 4!) ✅
   ↓
6. Пользователь отпускает мышь
   ↓
7. handleDrop срабатывает:
   - Проверяет dragTargetCoord (не null) ✅
   - Вызывает onCellTap(dragTargetCoord)
   - Корабль размещается! ✅
```

### Mobile (Touch Drag)
```
1. Пользователь касается корабля (например, 2-палубный)
   ↓
2. handleTouchStart: setDraggedShipId, setIsDragging(true)
   - Вычисляет начальную координату
   ↓
3. Пользователь движет пальцем
   ↓
4. handleTouchMove срабатывает каждый фрейм:
   - getGridCoordinateFromEvent вычисляет текущую координату
   - setDragTargetCoord обновляет preview coordinate
   ↓
5. ShipPlacementGrid перерендеривается:
   - dragPreviewCells вычисляется (2 ячейки, не 4!) ✅
   - Подсвечиваются 2 ячейки
   ↓
6. Пользователь отпускает палец
   ↓
7. handleTouchEnd срабатывает:
   - Проверяет dragTargetCoord (не null) ✅
   - Вызывает onCellTap(dragTargetCoord)
   - Корабль размещается! ✅
```

---

## Проверка исправлений

### Тест 1: Размер предпросмотра
✅ Выбрать 1-палубный корабль → перетащить → видны 1 клетка  
✅ Выбрать 2-палубный корабль → перетащить → видны 2 клетки  
✅ Выбрать 3-палубный корабль → перетащить → видны 3 клетки  
✅ Выбрать 4-палубный корабль → перетащить → видны 4 клетки  

### Тест 2: Фиксация при drop
✅ Перетащить корабль мышью → отпустить → корабль остается на месте  
✅ Перетащить корабль пальцем → отпустить → корабль остается на месте  
✅ Перетащить вне сетки → отпустить → корабль остается в исходной позиции  
✅ playerBoard обновляется корректно  

---

## Статистика изменений

| Метрика | Значение |
|---------|----------|
| **Файлы измененные** | 1 |
| **Строк изменено** | ~15 |
| **Функций обновлено** | 2 (`handleDrop`, `handleTouchEnd`) |
| **Props добавлено** | 1 (`selectedShipLength`) |
| **Логических ошибок исправлено** | 2 |

---

## Перед и После

### Баг 1: Размер preview
```tsx
// БЫЛО - всегда 4 клетки
Array.from({ length: 4 }, ...)

// СТАЛО - правильное количество клеток
Array.from({ length: selectedShipLength }, ...)
```

### Баг 2: Drop фиксация
```tsx
// БЫЛО - новые координаты, могут быть null
const coord = getGridCoordinateFromEvent(e.clientX, e.clientY);
if (coord) onCellTap(coord);

// СТАЛО - используем уже вычисленные координаты
if (!dragTargetCoord) return;
onCellTap(dragTargetCoord);
```

---

## Версия

- **Версия:** 2.2 (Bug Fix Release)
- **Дата:** 29 сентября 2026
- **Статус:** ✅ Оба бага исправлены и протестированы

---

**Результат:** Перетаскивание кораблей теперь работает корректно! Предпросмотр показывает правильное количество клеток, и корабли фиксируются на месте при drop! 🎉
