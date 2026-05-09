/**
 * Модуль для работы с localStorage
 * Сохранение и загрузка состояния участка
 */

const STORAGE_KEY = 'osetrova-house-state';
const LEGACY_STORAGE_KEY = 'house-planner-state';

export interface PlotState {
  // Участок
  plotWidth: number;
  plotLength: number;

  // Дом
  house: {
    width: number;
    length: number;
    floors: number;
    material: string; // хранится строкой (для совместимости), но нормализуем при загрузке
    x: number;
    y: number;
    rotation: number;
  } | null;

  // Постройки
  buildings: Array<{
    id: string;
    type: string;
    width: number;
    length: number;
    x: number;
    y: number;
    rotation?: number;
  }>;

  // Растения
  plants: Array<{
    id: string;
    type: string;
    width: number;
    length: number;
    x: number;
    y: number;
    size?: number;
    rotation?: number;
  }>;



  // Текущий экран (КЛЮЧЕВОЕ ПОЛЕ)
  currentScreen: 'terrain' | 'house' | 'buildings' | 'plants' | 'summary';
}

/** Начальное состояние */
export function getInitialState(): PlotState {
  return {
    plotWidth: 20,
    plotLength: 30,
    house: null,
    buildings: [],
    plants: [],
    currentScreen: 'terrain',
  };
}

/** Приводим материал к новой системе (brick/wood), без газоблока */
function normalizeHouseMaterial(input: unknown): 'brick' | 'wood' {
  const s = String(input ?? '').toLowerCase();

  // дерево (поддержим рус/англ на всякий)
  if (s.includes('wood') || s.includes('дерев')) return 'wood';

  // всё остальное, включая 'block', 'brick', пустое и т.п. -> brick
  return 'brick';
}

/** Санитайз состояния */
function normalizeState(input: any): PlotState {
  const init = getInitialState();

  const plotWidth = typeof input?.plotWidth === 'number' ? input.plotWidth : init.plotWidth;
  const plotLength = typeof input?.plotLength === 'number' ? input.plotLength : init.plotLength;

  const house =
    input?.house && typeof input.house === 'object'
      ? {
          width: Number(input.house.width) || 10,
          length: Number(input.house.length) || 10,
          floors: Number(input.house.floors) || 1,
          // ✅ тут главное: убираем block, оставляем brick/wood
          material: normalizeHouseMaterial(input.house.material),
          x: Number(input.house.x) || Math.round(plotWidth / 2),
          y: Number(input.house.y) || Math.round(plotLength / 2),
          rotation: Number(input.house.rotation) || 0,
        }
      : null;

  const buildings = Array.isArray(input?.buildings) ? input.buildings : [];
  const plants = Array.isArray(input?.plants)
    ? input.plants.map((p: any) => {
        const w = Number(p.width) || Number(p.size) || 1;
        const l = Number(p.length) || Number(p.size) || 1;

        return {
          id: String(p.id),
          type: String(p.type),
          width: w,
          length: l,
          x: Number(p.x) || 1,
          y: Number(p.y) || 1,
        };
      })
    : [];


  const allowedScreens: PlotState['currentScreen'][] = [
    'terrain',
    'house',
    'buildings',
    'plants',
    'summary',
  ];

  const rawScreen = input?.currentScreen === 'farm' ? 'summary' : input?.currentScreen;
  const currentScreen = allowedScreens.includes(rawScreen as PlotState['currentScreen'])
    ? (rawScreen as PlotState['currentScreen'])
    : init.currentScreen;

  return {
    plotWidth,
    plotLength,
    house,
    buildings,
    plants,
    currentScreen,
  };
}

/** Сохранить */
export function saveToStorage(state: PlotState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Загрузить */
export function loadFromStorage(): PlotState | null {
  const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!raw) return null;

  try {
    const state = normalizeState(JSON.parse(raw));
    if (!localStorage.getItem(STORAGE_KEY)) {
      saveToStorage(state);
    }
    return state;
  } catch {
    return null;
  }
}

/** Очистить */
export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

/** Проверка наличия */
export function hasSavedData(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null || localStorage.getItem(LEGACY_STORAGE_KEY) !== null;
}

/** Новый проект */
export function startNewProject(
  nextScreen: PlotState['currentScreen'] = 'terrain'
): PlotState {
  const fresh = { ...getInitialState(), currentScreen: nextScreen };
  saveToStorage(fresh);
  return fresh;
}
