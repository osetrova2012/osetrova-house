// src/utils/constants.ts
import type {
  BuildingType,
  HouseMaterial,
  NormRule,
  PlantType,
} from '../types';

export const APP_TITLE = 'Планировщик участка';
export const APP_SUBTITLE = 'Проектирование дома и участка';

// --- Участок / сетка ---
export const GRID_CELL_SIZE_M = 1; // 1 клетка = 1 метр (удобно и понятно)
export const GRID_MIN_ZOOM = 0.5;
export const GRID_MAX_ZOOM = 3;

// Нормативы (упрощённая база под ИЖС-валидацию; потом можно расширять)
export const MIN_PLOT_AREA_M2 = 600;   // 6 соток
export const MAX_PLOT_AREA_M2 = 3000;  // 30 соток
export const MIN_PLOT_WIDTH_M = 10;
export const MAX_BUILDING_COVERAGE = 0.4; // 40% площади

// --- Отступы (м) ---
export const SETBACKS = {
  houseToNeighborBorder: 3,
  houseToStreetRedLine: 5,
  houseToDrivewayRedLine: 3,

  outbuildingToBorder: 1,        // сарай/теплица/гараж и т.п.
  animalBuildingToBorder: 4,     // постройки с животными
  bathhouseToHouse: 8,

  treeHighToBorder: 4,
  treeMediumToBorder: 2,
  bushToBorder: 1,

  treeToHouse: 5,
  bushToHouse: 1.5,
} as const;

// --- Готовые шаблоны участка ---
export type PlotTemplateId = '6_sotok' | '8_sotok' | '10_sotok' | '15_sotok' | '25_sotok';

export const PLOT_TEMPLATES: Array<{
  id: PlotTemplateId;
  title: string;
  width: number;  // м
  length: number; // м
}> = [
  { id: '6_sotok', title: '6 соток (20×30 м)', width: 20, length: 30 },   // 600 м²
  { id: '8_sotok', title: '8 соток (20×40 м)', width: 20, length: 40 },   // 800 м²
  { id: '10_sotok', title: '10 соток (25×40 м)', width: 25, length: 40 }, // 1000 м²
  { id: '15_sotok', title: '15 соток (30×50 м)', width: 30, length: 50 }, // 1500 м²
  { id: '25_sotok', title: '25 соток (50×50 м)', width: 50, length: 50 }, // 2500 м²
];

// --- Дом (база для UI на экране "Весна") ---
export const HOUSE_MATERIALS: Array<{ id: HouseMaterial; title: string }> = [
  { id: 'wood', title: 'Дерево' },
  { id: 'brick', title: 'Кирпич' },
  { id: 'gasblock', title: 'Газоблок' },
  { id: 'frame', title: 'Каркас' },
];

export const HOUSE_DEFAULTS = {
  width: 10,
  length: 12,
  floors: 2,
  material: 'gasblock' as HouseMaterial,
} as const;

// --- Библиотека объектов (постройки/растения) ---
export const BUILDING_LIBRARY: Array<{
  type: BuildingType;
  title: string;
  defaultSize: { width: number; length: number };
  minBorderSetback: number; // м
}> = [
  {
    type: 'garage',
    title: 'Гараж',
    defaultSize: { width: 4, length: 6 },
    minBorderSetback: SETBACKS.outbuildingToBorder,
  },
  {
    type: 'shed',
    title: 'Сарай',
    defaultSize: { width: 3, length: 4 },
    minBorderSetback: SETBACKS.outbuildingToBorder,
  },
  {
    type: 'greenhouse',
    title: 'Теплица',
    defaultSize: { width: 3, length: 6 },
    minBorderSetback: SETBACKS.outbuildingToBorder,
  },
  {
    type: 'bathhouse',
    title: 'Баня',
    defaultSize: { width: 4, length: 5 },
    minBorderSetback: SETBACKS.outbuildingToBorder,
  },
  {
    type: 'toilet',
    title: 'Туалет',
    defaultSize: { width: 2, length: 2 },
    minBorderSetback: SETBACKS.outbuildingToBorder,
  },
  {
    type: 'animal_shed',
    title: 'Постройка для животных',
    defaultSize: { width: 4, length: 6 },
    minBorderSetback: SETBACKS.animalBuildingToBorder,
  },
];

export const PLANT_LIBRARY: Array<{
  type: PlantType;
  title: string;
  size: number; // м (условный радиус/размер для удобства)
  minBorderSetback: number; // м
  minHouseSetback: number;  // м
}> = [
  {
    type: 'tree_high',
    title: 'Высокое дерево',
    size: 2,
    minBorderSetback: SETBACKS.treeHighToBorder,
    minHouseSetback: SETBACKS.treeToHouse,
  },
  {
    type: 'tree_medium',
    title: 'Среднерослое дерево',
    size: 1.5,
    minBorderSetback: SETBACKS.treeMediumToBorder,
    minHouseSetback: SETBACKS.treeToHouse,
  },
  {
    type: 'bush',
    title: 'Кустарник',
    size: 1,
    minBorderSetback: SETBACKS.bushToBorder,
    minHouseSetback: SETBACKS.bushToHouse,
  },
  {
    type: 'flowerbed',
    title: 'Клумба',
    size: 1,
    minBorderSetback: 0, // условно можно ближе
    minHouseSetback: 0,
  },
];

// --- Нормы (для будущей InfoModal и validation.ts) ---
export const NORMS: NormRule[] = [
  {
    id: 'plot.minArea',
    title: 'Минимальная площадь участка',
    appliesTo: 'plot',
    severity: 'error',
    description: `Минимальная площадь участка: ${MIN_PLOT_AREA_M2} м² (6 соток).`,
    value: MIN_PLOT_AREA_M2,
  },
  {
    id: 'plot.maxArea',
    title: 'Максимальная площадь участка',
    appliesTo: 'plot',
    severity: 'warning',
    description: `Максимальная площадь участка: ${MAX_PLOT_AREA_M2} м² (25 соток).`,
    value: MAX_PLOT_AREA_M2,
  },
  {
    id: 'plot.minWidth',
    title: 'Минимальная ширина участка',
    appliesTo: 'plot',
    severity: 'warning',
    description: `Минимальная ширина участка: ${MIN_PLOT_WIDTH_M} м.`,
    value: MIN_PLOT_WIDTH_M,
  },
  {
    id: 'plot.coverage',
    title: 'Максимальная застройка',
    appliesTo: 'plot',
    severity: 'warning',
    description: `Застройка не должна превышать ${Math.round(MAX_BUILDING_COVERAGE * 100)}% площади участка.`,
    value: MAX_BUILDING_COVERAGE,
  },
  {
    id: 'house.toBorder',
    title: 'Дом до границы соседнего участка',
    appliesTo: 'house',
    severity: 'error',
    description: `Дом должен быть не ближе ${SETBACKS.houseToNeighborBorder} м к границе соседнего участка.`,
    value: SETBACKS.houseToNeighborBorder,
  },
  {
    id: 'house.toStreet',
    title: 'Дом до красной линии улицы',
    appliesTo: 'house',
    severity: 'warning',
    description: `Дом должен быть не ближе ${SETBACKS.houseToStreetRedLine} м до красной линии улицы.`,
    value: SETBACKS.houseToStreetRedLine,
  },
  {
    id: 'bathhouse.toHouse',
    title: 'Баня до дома',
    appliesTo: 'building',
    severity: 'warning',
    description: `Баня должна быть не ближе ${SETBACKS.bathhouseToHouse} м к дому.`,
    value: SETBACKS.bathhouseToHouse,
  },
];
