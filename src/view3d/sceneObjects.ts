// src/view3d/sceneObjects.ts

import type { PlotState } from '../storage/storage';
import type {
  SceneType,
  SceneVariant,
  HouseMaterial,
  HouseFloors,
  HouseAspect,
  BuildingType,
  PlantType,
} from './AssetsKeys';

/* ======================================================
   Scene objects selector (state -> logical objects)
   3D-рендеру пофиг на экраны: он рисует то, что уже есть в state.
====================================================== */

export type SceneObject = {
  id: string;
  type: SceneType;

  /** Позиция в метрах НА УЧАСТКЕ (как в state) */
  pos: { x: number; y: number };

  /** Габарит “в плане” (метры). */
  size?: { w: number; h: number };

  /** Поворот вокруг Y в градусах */
  rotationDeg?: number;

  /** Для выбора конкретного ассета (дом: материал/этажность/соотношение сторон) */
  variant?: SceneVariant;
};

/** Главная функция: собрать объекты сцены из PlotState */
export function selectSceneObjects(state: PlotState): SceneObject[] {
  const out: SceneObject[] = [];

  // Дом
  if (state.house) {
    const floors = clampFloors(state.house.floors);
    const material = normalizeHouseMaterial(state.house.material);
    const aspect = inferHouseAspect(state.house.width, state.house.length);

    out.push({
      id: 'house',
      type: 'house',
      pos: { x: state.house.x, y: state.house.y },
      size: { w: state.house.width, h: state.house.length },
      rotationDeg: state.house.rotation ?? 0,
      variant: {
        kind: 'house',
        material,
        floors,
        aspect,
      },
    });
  }

  // Постройки
  for (const b of state.buildings ?? []) {
    const type = normalizeBuildingType(b.type);
    if (!type) {
      console.warn('[buildings] unknown type in storage:', b.type, b);
      continue;
    }

    out.push({
      id: b.id,
      type,
      pos: { x: b.x, y: b.y },
      size: { w: b.width, h: b.length },
      rotationDeg: b.rotation ?? 0,
      variant: { kind: 'none' },
    });
  }

  // Растения / Насаждения
  for (const p of state.plants ?? []) {
    const type = normalizePlantType(p.type);
    if (!type) {
      console.warn('[plants] unknown type in storage:', p.type, p);
      continue;
    }

    out.push({
      id: p.id,
      type,
      pos: { x: p.x, y: p.y },
      rotationDeg: 0,
      variant: { kind: 'none' },
    });
  }

  return out;
}

/* ======================================================
   Helpers: normalize / infer
====================================================== */

function clampFloors(n: number): HouseFloors {
  if (n >= 3) return 3;
  if (n === 2) return 2;
  return 1;
}

/**
 * В storage.ts по умолчанию material = 'block'.
 * А в твоей системе: brick/wood.
 */
function normalizeHouseMaterial(input: unknown): HouseMaterial {
  const s = String(input ?? '').toLowerCase();

  if (s.includes('wood') || s.includes('дерев')) return 'wood';
  return 'brick'; // 'brick', 'кирпич', 'block' и всё остальное
}

/**
 * Определяем 1:1 или 2:1 по ширине/длине.
 * Если одна сторона примерно в 2 раза больше другой -> 2x1.
 * Иначе -> 1x1.
 */
function inferHouseAspect(width: number, length: number): HouseAspect {
  const w = Math.max(0.0001, Number(width) || 0.0001);
  const l = Math.max(0.0001, Number(length) || 0.0001);

  const maxSide = Math.max(w, l);
  const minSide = Math.min(w, l);
  const ratio = maxSide / minSide;

  // Допуск 20% вокруг "2.0"
  const is2to1 = Math.abs(ratio - 2) <= 0.2;
  return is2to1 ? '2x1' : '1x1';
}

function normalizeBuildingType(input: unknown): BuildingType | null {
  const s = String(input ?? '').toLowerCase().trim();

  // русские
  if (s.includes('теплиц')) return 'greenhouse';
  if (s.includes('бан')) return 'bathhouse';
  if (s.includes('гараж')) return 'garage';
  if (s.includes('будк')) return 'doghouse';
  if (s.includes('сарай')) return 'shed';

  // ключи/англ
  if (s === 'greenhouse') return 'greenhouse';
  if (s === 'bathhouse') return 'bathhouse';
  if (s === 'garage') return 'garage';
  if (s === 'doghouse') return 'doghouse';
  if (s === 'shed') return 'shed';

  return null;
}

function normalizePlantType(input: unknown): PlantType | null {
  const s = String(input ?? '').toLowerCase().trim();

  // русские деревья/кусты
  if (s.includes('дуб')) return 'oak';
  if (s.includes('берез') || s.includes('берёз')) return 'birch';
  if (s.includes('яблон')) return 'apple'; // не apple_tree, чтобы меньше путаницы
  if (s.includes('туя')) return 'thuja';
  if (s.includes('ель')) return 'spruce';

  // русские овощи
  if (s.includes('морков')) return 'carrot';
  if (s.includes('помид')) return 'tomato';
  if (s.includes('капуст')) return 'cabbage';
  if (s.includes('тыкв')) return 'pumpkin';

  // ключи/англ
  if (s === 'oak') return 'oak';
  if (s === 'birch') return 'birch';
  if (s === 'apple') return 'apple';
  if (s === 'apple_tree' || s === 'appletree') return 'apple'; // legacy -> apple
  if (s === 'thuja') return 'thuja';
  if (s === 'spruce') return 'spruce';

  if (s === 'carrot') return 'carrot';
  if (s === 'tomato') return 'tomato';
  if (s === 'cabbage') return 'cabbage';
  if (s === 'pumpkin') return 'pumpkin';

  return null;
}

/* ======================================================
   Math: plot coords -> world coords
====================================================== */

export function plotToWorldXZ(
  plotX: number,
  plotY: number,
  plotWidth: number,
  plotLength: number
): { x: number; z: number } {
  return {
    x: plotX - plotWidth / 2,
    z: plotY - plotLength / 2,
  };
}

export function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}
