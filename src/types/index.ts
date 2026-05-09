// src/types/index.ts
// Единое место для TS-типов, чтобы не плодить "any" по проекту :)

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

export type ScreenType =
  | 'menu'
  | 'terrain'
  | 'house'
  | 'buildings'
  | 'plants'
  | 'summary'
  | 'view3d';

export type ObjectKind = 'house' | 'building' | 'plant';

/**
 * Координаты и размеры — в метрах, в рамках 2D сетки.
 * x/y считаем от верхнего-левого угла участка.
 */
export interface Placement2D {
  x: number; // м
  y: number; // м
  rotation: number; // градусы (0/90/180/270 на старте — норм)
}

export interface PlotSize {
  width: number; // м
  length: number; // м
}

export interface PlotMeta {
  size: PlotSize;
  areaM2: number;
}

export type HouseMaterial = 'wood' | 'brick' | 'gasblock' | 'frame';

export interface HouseObject extends Placement2D {
  kind: 'house';
  width: number; // м
  length: number; // м
  floors: number; // 1-3
  material: HouseMaterial;
}

export type BuildingType =
  | 'garage'
  | 'shed'
  | 'greenhouse'
  | 'bathhouse'
  | 'toilet'
  | 'animal_shed';

export interface BuildingObject extends Placement2D {
  kind: 'building';
  id: string;
  type: BuildingType;
  width: number; // м
  length: number; // м
}

/**
 * ВАЖНО:
 * PlantType поддерживает:
 * 1) "категории" из constants.ts (tree_high/tree_medium/bush/flowerbed)
 * 2) "конкретику" из PlantsScreen (oak/birch/... + грядки)
 *
 * Так мы не ломаем constants.ts и одновременно можем хранить конкретные растения.
 */
export type PlantType =
  // категории (старый/универсальный формат)
  | 'tree_high'
  | 'tree_medium'
  | 'bush'
  | 'flowerbed'
  // конкретные растения / огород (новый формат)
  | 'oak'
  | 'birch'
  | 'apple'
  | 'thuja'
  | 'spruce'
  | 'carrot'
  | 'cabbage'
  | 'pumpkin'
  | 'tomato'
  | 'bed_1x2'
  | 'bed_1x3'
  | 'bed_2x6';

/**
 * Растение/грядка как объект на сетке.
 * Переходим на width/length (чтобы грядки 1×2, 2×6 и т.п. жили нормально).
 * size оставляем опционально для совместимости со старым форматом.
 */
export interface PlantObject extends Placement2D {
  kind: 'plant';
  id: string;
  type: PlantType;

  width: number;  // м
  length: number; // м

  size?: number;  // legacy: условный "радиус"/размер для старых сохранений
}

/**
 * Общее состояние (в будущем будет жить в PlotContext и сохраняться в localStorage).
 * Сейчас у тебя подобное уже есть в storage.ts — позже аккуратно сведём в одно место.
 */
export interface PlotState {
  plot: PlotMeta;
  season: Season;
  currentScreen: Exclude<ScreenType, 'menu'>;

  house: HouseObject | null;
  buildings: BuildingObject[];
  plants: PlantObject[];
}

/**
 * Нормы / валидация
 */
export type IssueSeverity = 'info' | 'warning' | 'error';

export interface ValidationIssue {
  severity: IssueSeverity;
  message: string;
  ruleId?: string;
  objectId?: string;
}

export type RuleAppliesTo = 'plot' | 'house' | 'building' | 'plant' | 'global';

export interface NormRule {
  id: string;
  title: string;
  appliesTo: RuleAppliesTo;
  severity: IssueSeverity;

  /**
   * Короткое описание (для "Нормы и справка")
   */
  description: string;

  /**
   * В числовых правилах — значение в метрах или долях (0..1), смотря по смыслу.
   * Например: min distance = 3 (м), max coverage = 0.4 (40%).
   */
  value?: number;
}
