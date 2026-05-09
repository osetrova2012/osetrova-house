import type { GridObject } from '../components/Grid/Grid';

type AABB = { minX: number; minY: number; maxX: number; maxY: number };

export function getAabb(o: GridObject): AABB {
  if (o.kind === 'rect') {
    return {
      minX: o.x - o.w / 2,
      minY: o.y - o.h / 2,
      maxX: o.x + o.w / 2,
      maxY: o.y + o.h / 2,
    };
  }
  // circle -> bounding box
  return { minX: o.x - o.r, minY: o.y - o.r, maxX: o.x + o.r, maxY: o.y + o.r };
}

export function aabbIntersects(a: AABB, b: AABB, padding = 0): boolean {
  // padding можно сделать = cellSizeM * 0.0..0.2 если хочешь “зазор”
  return !(
    a.maxX <= b.minX + padding ||
    a.minX >= b.maxX - padding ||
    a.maxY <= b.minY + padding ||
    a.minY >= b.maxY - padding
  );
}

export function intersectsAny(
  candidate: GridObject,
  objects: GridObject[],
  ignoreId?: string,
  padding = 0
): boolean {
  const a = getAabb(candidate);
  for (const o of objects) {
    if (ignoreId && o.id === ignoreId) continue;
    const b = getAabb(o);
    if (aabbIntersects(a, b, padding)) return true;
  }
  return false;
}
