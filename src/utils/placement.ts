import type { GridObject } from '../components/Grid/Grid';
import { intersectsAny } from './collisions';

type RectTemplate = Omit<Extract<GridObject, { kind: 'rect' }>, 'x' | 'y'>;
type CircleTemplate = Omit<Extract<GridObject, { kind: 'circle' }>, 'x' | 'y'>;

export type PlaceTemplate = RectTemplate | CircleTemplate;

function getHalf(template: PlaceTemplate) {
  if (template.kind === 'rect') {
    return { hx: template.w / 2, hy: template.h / 2 };
  }
  return { hx: template.r, hy: template.r };
}

/**
 * Ищет свободную позицию по сетке внутри участка.
 * Возвращает центр объекта (x,y) или null, если места нет.
 *
 * padding:
 *  - 0 => можно вплотную
 *  - cellSize => зазор в 1 клетку
 */
export function findFreePlacement(
  template: PlaceTemplate,
  existing: GridObject[],
  plotW: number,
  plotH: number,
  cellSize: number,
  padding = 0
): { x: number; y: number } | null {
  const { hx, hy } = getHalf(template);

  // Если объект физически не влезает в участок — сразу null
  if (2 * hx > plotW || 2 * hy > plotH) return null;

  // Перебор по сетке: слева-направо, сверху-вниз
  // (если позже захочешь “красиво от центра” — заменим на спираль)
  for (let y0 = 0; y0 <= plotH - 2 * hy; y0 += cellSize) {
    for (let x0 = 0; x0 <= plotW - 2 * hx; x0 += cellSize) {
      const x = x0 + hx;
      const y = y0 + hy;

      const candidate = { ...(template as any), x, y } as GridObject;

      if (!intersectsAny(candidate, existing, undefined, padding)) {
        return { x, y };
      }
    }
  }

  return null;
}
