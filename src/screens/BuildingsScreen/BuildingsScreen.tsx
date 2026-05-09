import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header/Header';
import Grid, { type GridObject } from '../../components/Grid/Grid';
import FooterBar from '../../components/FooterBar/FooterBar';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import NormsModal from '../../components/NormsModal/NormsModal';


import { loadFromStorage, saveToStorage, getInitialState } from '../../storage/storage';
import type { ScreenType } from '../../types';

import { GRID_CELL_SIZE_M } from '../../utils/constants';
import { getAabb, aabbIntersects } from '../../utils/collisions';

import './BuildingsScreen.css';

type BuildingType = 'greenhouse' | 'bathhouse' | 'garage' | 'doghouse';

type StoredBuilding = {
  id: string;
  type: string;
  width: number;
  length: number;
  x: number;
  y: number;
};

type Preset = {
  type: BuildingType;
  title: string;
  subtitle: string;
  width: number;
  length: number;
  emoji: string;
  fill: string;
  stroke: string;
};

function snap(v: number, step: number) {
  return Math.round(v / step) * step;
}
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export default function BuildingsScreen({ onNavigate }: { onNavigate: (s: ScreenType) => void }) {

  const [normsOpen, setNormsOpen] = useState(false);

  const [initial] = useState(() => loadFromStorage() ?? getInitialState());

  const [plotWidth] = useState(initial.plotWidth);
  const [plotLength] = useState(initial.plotLength);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [placeMode, setPlaceMode] = useState(false);
  const [selected, setSelected] = useState<BuildingType | null>(null);

  const [buildings, setBuildings] = useState<StoredBuilding[]>(initial.buildings ?? []);

  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);


  const PRESETS: Preset[] = useMemo(
    () => [
      {
        type: 'greenhouse',
        title: 'Теплица',
        subtitle: 'Для рассады и овощей',
        width: 3,
        length: 6,
        emoji: `assets/icons/greenhouse.svg`,
        fill: 'rgba(34, 197, 94, 0.14)',
        stroke: 'rgba(34, 197, 94, 0.85)',
      },
      {
        type: 'bathhouse',
        title: 'Баня',
        subtitle: 'Пар и релакс',
        width: 4,
        length: 6,
        emoji: `assets/icons/bathhouse.svg`,
        fill: 'rgba(245, 158, 11, 0.14)',
        stroke: 'rgba(245, 158, 11, 0.85)',
      },
      {
        type: 'garage',
        title: 'Гараж',
        subtitle: 'Для машины и хоз. вещей',
        width: 4,
        length: 6,
        emoji: `assets/icons/garage.svg`,
        fill: 'rgba(59, 130, 246, 0.14)',
        stroke: 'rgba(59, 130, 246, 0.85)',
      },
      {
        type: 'doghouse',
        title: 'Будка',
        subtitle: 'Домик для собаки',
        width: 2,
        length: 2,
        emoji: `assets/icons/doghouse.svg`,
        fill: 'rgba(236, 72, 153, 0.10)',
        stroke: 'rgba(236, 72, 153, 0.85)',
      },
    ],
    []
  );

  // Нормы до забора (в метрах)
  const FENCE_SETBACK_M: Record<BuildingType, number> = useMemo(
    () => ({
      greenhouse: 1, // теплица ≥ 1 м до забора
      garage: 1, // гараж ≥ 1 м до забора
      doghouse: 4, // будка ≥ 4 м до забора
      bathhouse: 0, // по твоей таблице до забора не задано
    }),
    []
  );

  const persist = (nextBuildings: StoredBuilding[]) => {
    saveToStorage({
      plotWidth,
      plotLength,
      house: initial.house ?? null,
      buildings: nextBuildings,
      plants: initial.plants ?? [],
      currentScreen: 'buildings',
    });
  };

  // Быстро получить тип постройки по id (из buildings)
  const getBuildingTypeById = (id: string): BuildingType | null => {
    const b = buildings.find((x) => x.id === id);
    if (!b) return null;
    const t = String(b.type) as BuildingType;
    return t;
  };

  // Дом + постройки в GridObject[]
  const objects: GridObject[] = useMemo(() => {
    const out: GridObject[] = [];

    if (initial.house) {
      out.push({
        id: 'house',
        kind: 'rect',
        x: initial.house.x,
        y: initial.house.y,
        w: initial.house.width,
        h: initial.house.length,
        label: `Дом • ${initial.house.floors} эт.`,
        fill: 'rgba(17, 24, 39, 0.06)',
        stroke: 'rgba(17, 24, 39, 0.55)',
      });
    }

    for (const b of buildings) {
      const p = PRESETS.find((x) => x.type === (b.type as BuildingType));
      out.push({
        id: b.id,
        kind: 'rect',
        x: b.x,
        y: b.y,
        w: b.width,
        h: b.length,
        label: p?.title ?? 'Постройка',
        fill: p?.fill ?? 'rgba(34, 197, 94, 0.12)',
        stroke: p?.stroke ?? 'rgba(34, 197, 94, 0.85)',
      });
    }

    return out;
  }, [buildings, PRESETS, initial.house]);

  // ---- Проверки норм ----

  // Проверка отступа до забора (границы участка)
  const checkFenceSetback = (candidate: GridObject, type: BuildingType) => {
    const s = FENCE_SETBACK_M[type] ?? 0;
    if (s <= 0) return { ok: true as const, msg: '' };

    const a = getAabb(candidate);
    // участок: 0..plotWidth, 0..plotLength
    if (a.minX < s || a.minY < s || a.maxX > plotWidth - s || a.maxY > plotLength - s) {
      return { ok: false as const, msg: `Нужно отступить от забора минимум ${s} м` };
    }
    return { ok: true as const, msg: '' };
  };

  // Проверка парных правил (баня ↔ дом 8м)
  const checkPairRules = (candidate: GridObject, candidateType: BuildingType, ignoreId?: string) => {
    const a = getAabb(candidate);

    for (const o of objects) {
      if (ignoreId && o.id === ignoreId) continue;

      // базовое правило: не пересекаться вообще
      let padding = 0;

      // доп. правило: баня ≥ 8м до дома (в обе стороны)
      const isOtherHouse = o.id === 'house';
      const isCandBathToHouse = candidateType === 'bathhouse' && isOtherHouse;
      const isCandHouseToBath = candidate.id === 'house' && getBuildingTypeById(o.id) === 'bathhouse'; // на всякий

      if (isCandBathToHouse || isCandHouseToBath) {
        padding = 8;
      }

      const b = getAabb(o);
      if (aabbIntersects(a, b, padding)) {
        if (padding === 8) return { ok: false as const, msg: 'Баня должна быть минимум в 8 м от дома' };
        return { ok: false as const, msg: 'Нельзя разместить объект поверх другого' };
      }
    }

    return { ok: true as const, msg: '' };
  };

  // Общая проверка кандидата (и для постановки, и для движения)
  const validateCandidate = (candidate: GridObject, type: BuildingType, ignoreId?: string) => {
    // 1) границы участка (влезть физически)
    const a = getAabb(candidate);
    if (a.minX < 0 || a.minY < 0 || a.maxX > plotWidth || a.maxY > plotLength) {
      return { ok: false as const, msg: 'Объект не влезает в участок' };
    }

    // 2) отступ до забора (по типу)
    const fence = checkFenceSetback(candidate, type);
    if (!fence.ok) return fence;

    // 3) пересечения + спец-правила (баня- дом 8м)
    const pairs = checkPairRules(candidate, type, ignoreId);
    if (!pairs.ok) return pairs;

    return { ok: true as const, msg: '' };
  };

  // ---- UI / actions ----

  const openSheet = () => {
    setSheetOpen(true);
    setPlaceMode(false);
    setSelected(null);
  };

  const startPlace = (type: BuildingType) => {
    setSelected(type);
    setPlaceMode(true);
    setSheetOpen(false);
    setNotice('Тапни по сетке, чтобы поставить постройку');
  };

  const placeAt = (pos: { xM: number; yM: number }) => {
    if (!placeMode || !selected) return;

    const preset = PRESETS.find((p) => p.type === selected);
    if (!preset) return;

    const halfW = preset.width / 2;
    const halfL = preset.length / 2;

    // snap по левому верхнему углу
    let x = snap(pos.xM - halfW, GRID_CELL_SIZE_M) + halfW;
    let y = snap(pos.yM - halfL, GRID_CELL_SIZE_M) + halfL;

    // clamp грубо по участку (физически)
    x = clamp(x, halfW, plotWidth - halfW);
    y = clamp(y, halfL, plotLength - halfL);

    const id = `bld-${selected}-${Date.now()}`;

    const candidate: GridObject = {
      id,
      kind: 'rect',
      x,
      y,
      w: preset.width,
      h: preset.length,
      label: preset.title,
      fill: preset.fill,
      stroke: preset.stroke,
    };

    const v = validateCandidate(candidate, selected, id);
    if (!v.ok) {
      setNotice(v.msg);
      return; // остаёмся в режиме постановки
    }

    const next: StoredBuilding[] = [
      ...buildings,
      {
        id,
        type: preset.type,
        width: preset.width,
        length: preset.length,
        x,
        y,
      },
    ];

    setBuildings(next);
    persist(next);

    setPlaceMode(false);
    setSelected(null);
    setNotice('Постройка добавлена');
  };

  const handleMoveObject = (id: string, nextPos: { x: number; y: number }) => {
    if (id === 'house') return;

    const idx = buildings.findIndex((b) => b.id === id);
    if (idx < 0) return;

    const current = buildings[idx];
    const t = (current.type as BuildingType) ?? null;
    if (!t) return;

    const halfW = current.width / 2;
    const halfL = current.length / 2;

    const x = clamp(nextPos.x, halfW, plotWidth - halfW);
    const y = clamp(nextPos.y, halfL, plotLength - halfL);

    const candidate: GridObject = {
      id,
      kind: 'rect',
      x,
      y,
      w: current.width,
      h: current.length,
      label: undefined,
    };

    const v = validateCandidate(candidate, t, id);
    if (!v.ok) {
      setNotice(v.msg);
      return; // не принимаем новую позицию => объект визуально “упрётся”
    }

    const next = buildings.slice();
    next[idx] = { ...current, x, y };

    setBuildings(next);
    persist(next);
  };

  const handleDeleteAll = () => {
    setBuildings([]);
    persist([]);
    setNotice('Все постройки удалены');
  };

  const handleNext = () => {
    saveToStorage({
      plotWidth,
      plotLength,
      house: initial.house ?? null,
      buildings,
      plants: initial.plants ?? [],
      currentScreen: 'plants',
    });

    onNavigate('plants');
  };

  return (
    <div className="buildings-screen">
      <div className="buildings-grid-bg">
        <Grid
          plotWidthM={plotWidth}
          plotLengthM={plotLength}
          objects={objects}
          onMoveObject={handleMoveObject}
          onTapCell={placeAt}
          onBlockedMove={(msg) => setNotice(msg)}
          showTerrainDecor
          redLineOffsetM={2}
          redLineLabel="Красная линия улицы"
          neighborLabel="Соседний участок"
        />
      </div>

      <Header
        season="spring"
        title="Постройки"
        progress={{ current: 3, total: 6 }}
        onBack={() => onNavigate('menu')}
        onOpenInfo={() => setNormsOpen(true)}
      />

      <FooterBar
        leftLabel="3D вид"
        leftIcon={`assets/icons/ui/3D.svg`}
        onLeft={() => onNavigate('view3d')}
        centerLabel="Добавить постройку"
        centerIcon={`assets/icons/garage.svg`}
        onCenter={openSheet}
        rightLabel="Далее"
        onRight={handleNext}
        rightDisabled={false}
      />
<NormsModal open={normsOpen} onClose={() => setNormsOpen(false)} />

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Постройки" height="md">
        <div className="buildings-sheet">
          <div className="buildings-sheet-head">
            <div className="buildings-sheet-sub">
              Карточка → тап по сетке.
              <br />
              Нормы: теплица/гараж ≥ 1м до забора, будка ≥ 4м, баня ≥ 8м от дома.
            </div>

            {buildings.length > 0 ? (
              <button type="button" className="buildings-danger" onClick={handleDeleteAll}>
                Удалить все
              </button>
            ) : null}
          </div>

          <div className="buildings-cards">
            {PRESETS.map((p) => {
              const area = p.width * p.length;
              return (
                <button
  key={p.type}
  type="button"
  className="bcard"
  disabled={p.type === 'bathhouse' || p.type === 'doghouse'}
  onClick={
    p.type === 'bathhouse' || p.type === 'doghouse'
      ? undefined
      : () => startPlace(p.type)
  }
>

                  <div className="bcard-top">
                    <div className="bcard-emoji">
  <img src={p.emoji} alt={p.title} className="bcard-icon" />
</div>
                    <div className="bcard-title">{p.title}</div>
                  </div>

                  <div className="bcard-sub">{p.subtitle}</div>

                  <div className="bcard-meta">
                    <span className="bmeta-pill">
                      {p.width}×{p.length} м
                    </span>
                    <span className="bmeta-pill">{area} м²</span>
                  </div>

                  <div className="bcard-cta">Поставить</div>
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>

      {notice ? <div className="toast">{notice}</div> : null}
    </div>
  );
}
