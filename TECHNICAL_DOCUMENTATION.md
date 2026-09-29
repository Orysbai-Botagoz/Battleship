# Техническая документация: ShipPlacementBoard v2.0

## Архитектура компонента

### Компонент верхнего уровня: `ShipPlacementBoard`

```tsx
export function ShipPlacementBoard({
  // Props от родителя (GameScreen)
  board: BoardState,
  orientation: Axis,
  selectedShipLength: ShipLength,
  remainingByLength: Record<ShipLength, number>,
  difficulty: Difficulty,
  message: string,
  
  // Callbacks
  onSelectLength: (length: ShipLength) => void,
  onToggleOrientation: () => void,
  onAutoPlace: () => void,
  onClear: () => void,
  onCellTap: (coordinate: Coordinate) => void,
  onStartBattle: () => void,
  onChangeDifficulty: (difficulty: Difficulty) => void,
}: ShipPlacementBoardProps)
```

### Подкомпонент: `ShipPlacementGrid`

Отделенный компонент для рендеринга сетки с кораблями.

```tsx
interface ShipPlacementGridProps {
  board: BoardState,
  orientation: Axis,
  draggedShipId: string | null,
  onCellTap: (coordinate: Coordinate) => void,
  onToggleOrientation: () => void,
}
```

## State Management

### Local State в `ShipPlacementBoard`

```tsx
const [draggedShipId, setDraggedShipId] = useState<string | null>(null);
// ↑ ID корабля, который в данный момент перетаскивается

const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
// ↑ Смещение при перетаскивании (не использовалось в финальной версии, 
//    можно удалить в следующей версии)

const gridContainerRef = useRef<HTMLDivElement>(null);
// ↑ Ref на контейнер сетки для вычисления координат
```

## Ключевые функции

### 1. `getGridCoordinateFromEvent(clientX, clientY)`

**Цель**: Конвертировать экранные координаты (mouse/touch) в координаты сетки

**Параметры:**
- `clientX: number` - координата X в окне браузера
- `clientY: number` - координата Y в окне браузера

**Возвращает:** `Coordinate | null`
- `{ row: number, col: number }` если координата внутри сетки
- `null` если вне сетки

**Логика:**
1. Получить BoundingClientRect контейнера сетки
2. Вычислить относительные координаты
3. Учесть padding (p-2 = 8px)
4. Учесть gaps между ячейками (gap-1 = 4px)
5. Вычислить размер одной ячейки
6. Определить row и col через цикл с накоплением позиции
7. Проверить границы

**Формула:**
```
cellWidth = (gridWidth - totalGaps) / cellsPerRow
cellHeight = (gridHeight - totalGaps) / boardSize

row = ceil(adjustedY / (cellHeight + gap))
col = ceil(adjustedX / (cellWidth + gap))
```

### 2. `handleDragStart(e: React.DragEvent)`

**Срабатывает:** При начале перетаскивания мышью

**Функция:**
1. Найти ближайший элемент с `data-ship-id`
2. Извлечь `shipId` из атрибута
3. Установить `draggedShipId` в state
4. Установить эффект: `effectAllowed = "move"`
5. Установить невидимое изображение для drag-образа

```tsx
const img = new Image();
img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
e.dataTransfer.setDragImage(img, 0, 0);
```

### 3. `handleDragOver(e: React.DragEvent)`

**Срабатывает:** Когда элемент перетаскивается над контейнером

**Функция:**
1. Предотвратить default-поведение: `e.preventDefault()`
2. Установить drop-эффект: `dropEffect = "move"`

### 4. `handleDrop(e: React.DragEvent)`

**Срабатывает:** Когда элемент отпущен над контейнером

**Функция:**
1. Предотвратить default-поведение
2. Проверить что есть `draggedShipId`
3. Вычислить координаты: `getGridCoordinateFromEvent(e.clientX, e.clientY)`
4. Очистить `draggedShipId`
5. Вызвать `onCellTap` с вычисленными координатами

### 5. `handleTouchStart(e: React.TouchEvent)`

**Срабатывает:** При касании экрана

**Функция:**
1. Найти ближайший элемент с `data-ship-id`
2. Извлечь `shipId`
3. Установить `draggedShipId`

### 6. `handleTouchMove(e: React.TouchEvent)`

**Срабатывает:** При движении пальца по экрану

**Функция:**
1. Если есть `draggedShipId`:
   - Предотвратить default-скроллинг: `e.preventDefault()`

### 7. `handleTouchEnd(e: React.TouchEvent)`

**Срабатывает:** При отпускании пальца

**Функция:**
1. Проверить что есть `draggedShipId`
2. Получить последнее касание: `e.changedTouches[0]`
3. Вычислить координаты: `getGridCoordinateFromEvent(touch.clientX, touch.clientY)`
4. Очистить `draggedShipId`
5. Если координаты валидны: вызвать `onCellTap`

## Data Flow

```
Пользователь действует
        ↓
[Mouse: handleDragStart] или [Touch: handleTouchStart]
        ↓
draggedShipId = ship.id (хранится в state)
        ↓
[Mouse: handleDragOver] или [Touch: handleTouchMove]
        ↓
[Mouse: handleDrop] или [Touch: handleTouchEnd]
        ↓
getGridCoordinateFromEvent(x, y) → {row, col}
        ↓
onCellTap({row, col})
        ↓
placeSelectedShipAt() в useBattleshipGame
        ↓
Board обновляется и перерендеривается
```

## Event Handling

### HTML Drag and Drop API (Desktop)

```
dragstart (на draggable элементе)
   ↓
dragover (на drop-target)
   ↓
drop (на drop-target)
   ↓
dragend (опционально, при отмене)
```

### Touch API (Mobile)

```
touchstart (на touch-target)
   ↓
touchmove (на document/body)
   ↓
touchend (когда палец отпущен)
```

## CSS Classes и Стили

### На cell-button:
```tsx
"relative aspect-square min-h-7 rounded-[4px] border transition sm:min-h-8"

// Для кораблей:
"bg-ocean-500/90 border-ocean-300 cursor-grab active:cursor-grabbing"

// Для пустых ячеек:
"bg-ocean-950 border-ocean-900"

// Для попаданий:
"bg-rose-500/90 border-rose-300"

// Для промахов:
"bg-slate-700/80 border-slate-600"
```

### Визуальный feedback при перетаскивании:

```tsx
{isShip && draggedShipId === cell.shipId && (
  <div className="absolute inset-0 rounded-[4px] bg-white/20 border-2 border-white" />
)}
```

Белая полупрозрачная граница появляется вокруг перетаскиваемого корабля.

## Проблемы и решения

### Проблема 1: Точное определение ячейки при drag-and-drop

**Решение:** Использование циклов для вычисления row/col вместо простого деления:
```tsx
for (let i = 0; i < cellsPerRow; i++) {
  if (adjustedX < currentX + cellWidth) {
    col = i;
    break;
  }
  currentX += cellWidth + gap;
}
```

Это учитывает累积 gaps между ячейками.

### Проблема 2: Работа с touch на мобильных браузерах

**Решение:** Явное использование `e.preventDefault()` в `handleTouchMove`:
```tsx
const handleTouchMove = useCallback(
  (e: React.TouchEvent<HTMLDivElement>) => {
    if (!draggedShipId) return;
    e.preventDefault(); // ← Предотвращает скроллинг страницы
  },
  [draggedShipId],
);
```

### Проблема 3: Визуальность drag-образа

**Решение:** Установка невидимого 1x1px изображения:
```tsx
const img = new Image();
img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
e.dataTransfer.setDragImage(img, 0, 0);
```

## Performance Considerations

### Оптимизации:

1. **useCallback** для всех обработчиков событий:
   - Избегает пересоздания функций при каждом render
   - Правильная зависимость в dependency array

2. **Мемоизация `getGridCoordinateFromEvent`**:
   - Зависит только от `board.size`
   - Пересчитывается только при смене размера доски

3. **Ленивое вычисление координат**:
   - Координаты вычисляются только при drop/touchend
   - Не вычисляются постоянно во время перемещения

### Потенциальные улучшения:

1. Добавить `useTransition` для smooth переключения состояния
2. Использовать `Suspense` для ленивой загрузки сетки
3. Мемоизировать `ShipPlacementGrid` с `React.memo`

## Browser Support

| Функция | Chrome | Firefox | Safari | Edge | Mobile |
|---------|--------|---------|--------|------|--------|
| HTML5 Drag & Drop | ✅ 4.0+ | ✅ 3.6+ | ✅ 3.1+ | ✅ All | ⚠️ Limited |
| Touch Events | ✅ 18+ | ✅ 6+ | ✅ iOS 2.0+ | ✅ All | ✅ All |
| getBoundingClientRect | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All |

## Debugging Tips

### Логирование координат:
```tsx
const coord = getGridCoordinateFromEvent(e.clientX, e.clientY);
console.log('Computed coordinate:', coord); // { row: 2, col: 3 }
```

### Проверка draggedShipId:
```tsx
console.log('Current dragged ship:', draggedShipId);
```

### Инспектирование HTML Drag API:
```tsx
e.dataTransfer.effectAllowed = "move";
console.log('Drop effect set to:', e.dataTransfer.dropEffect);
```

## Testing Checklist

- [ ] Drag корабля мышью на desktop
- [ ] Touch-перетаскивание на мобильном
- [ ] Клик по пустой ячейке размещает корабль
- [ ] Клик вне сетки не размещает корабль
- [ ] Размещение вне границ отклоняется
- [ ] Размещение на занятую ячейку отклоняется
- [ ] Сообщения об ошибках отображаются
- [ ] Кнопка поворота работает
- [ ] На разных размерах экрана (мобиль, планшет, десктоп)

## Future Improvements

1. **Undo/Redo система** для отмены размещений
2. **Visual preview** при наведении показывающий где разместится корабль
3. **Валидация in real-time** с подсветкой валидных позиций зеленым
4. **Animations** при размещении корабля
5. **Keyboard shortcuts** (R для rotate, A для auto, C для clear)
6. **Ship rotation on double-click**
7. **Context menu** на корабле для быстрых действий
8. **Accessibility** улучшения (ARIA labels, keyboard navigation)

---

**Версия документации:** 1.0  
**Последнее обновление:** 29 сентября 2026  
**Статус:** Production Ready ✅
