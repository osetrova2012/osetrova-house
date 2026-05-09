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

import './PlantsScreen.css';

type PlantType =
  | 'oak'
  | 'birch'
  | 'apple'
  | 'thuja'
  | 'carrot'
  | 'cabbage'
  | 'pumpkin'
  | 'tomato'
  | 'spruce';

type BuildingType = 'greenhouse' | 'bathhouse' | 'garage' | 'doghouse';

const BUILDING_LABELS: Record<BuildingType, string> = {
  greenhouse: 'Теплица',
  bathhouse: 'Баня',
  garage: 'Гараж',
  doghouse: 'Будка',
};

type StoredPlant = {
  id: string;
  type: string;
  width: number;
  length: number;
  x: number;
  y: number;
  size?: number;
};

type Preset = {
  type: PlantType;
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

export default function PlantsScreen({ onNavigate }: { onNavigate: (s: ScreenType) => void }) {
  const [normsOpen, setNormsOpen] = useState(false);

  const [initial] = useState(() => loadFromStorage() ?? getInitialState());

  const [plotWidth] = useState(initial.plotWidth);
  const [plotLength] = useState(initial.plotLength);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [placeMode, setPlaceMode] = useState(false);
  const [selected, setSelected] = useState<PlantType | null>(null);

  const [plants, setPlants] = useState<StoredPlant[]>(() => {
    // initial.plants уже нормализован в storage.ts
    return initial.plants?.map((p) => ({
      id: String(p.id),
      type: String(p.type),
      width: Number(p.width) || Number(p.size) || 1,
      length: Number(p.length) || Number(p.size) || 1,
      x: Number(p.x) || 1,
      y: Number(p.y) || 1,
    })) ?? [];
  });

  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  const PRESETS: Preset[] = useMemo(
    () => [
      // Деревья
      {
        type: 'oak',
        title: 'Дуб',
        subtitle: 'Высокое дерево',
        width: 4,
        length: 4,
        emoji: `assets/icons/oak.svg`,
        fill: 'rgba(34, 197, 94, 0.14)',
        stroke: 'rgba(34, 197, 94, 0.85)',
      },
      {
        type: 'birch',
        title: 'Берёза',
        subtitle: 'Среднее дерево',
        width: 3,
        length: 3,
        emoji: `assets/icons/birch.svg`,
        fill: 'rgba(16, 185, 129, 0.14)',
        stroke: 'rgba(16, 185, 129, 0.85)',
      },
      {
        type: 'apple',
        title: 'Яблоня',
        subtitle: 'Среднее дерево',
        width: 3,
        length: 3,
        emoji: `assets/icons/apple.svg`,
        fill: 'rgba(34, 197, 94, 0.12)',
        stroke: 'rgba(34, 197, 94, 0.85)',
      },
      {
        type: 'thuja',
        title: 'Туя',
        subtitle: 'Куст/живая изгородь',
        width: 2,
        length: 2,
        emoji: `assets/icons/tuya.svg`,
        fill: 'rgba(20, 184, 166, 0.14)',
        stroke: 'rgba(20, 184, 166, 0.90)',
      },
     

      // Овощи (теперь сразу “грядки с овощами” по размеру)
      {
        type: 'carrot',
        title: 'Морковь',
        subtitle: 'Овощи (грядка 1×2)',
        width: 1,
        length: 2,
        emoji: `assets/icons/carrot.svg`,
        fill: 'rgba(245, 158, 11, 0.12)',
        stroke: 'rgba(245, 158, 11, 0.90)',
      },
      {
        type: 'tomato',
        title: 'Помидоры',
        subtitle: 'Овощи (грядка 1×3)',
        width: 1,
        length: 3,
        emoji: `assets/icons/tomato.svg`,
        fill: 'rgba(239, 68, 68, 0.10)',
        stroke: 'rgba(239, 68, 68, 0.90)',
      },
      {
        type: 'cabbage',
        title: 'Капуста',
        subtitle: 'Овощи (грядка 2×6)',
        width: 2,
        length: 6,
        emoji: `assets/icons/cabbage.svg`,
        fill: 'rgba(132, 204, 22, 0.12)',
        stroke: 'rgba(132, 204, 22, 0.90)',
      },
      {
        type: 'pumpkin',
        title: 'Тыква',
        subtitle: 'Овощи (грядка 2×6)',
        width: 2,
        length: 6,
        emoji: `assets/icons/pumpkin.svg`,
        fill: 'rgba(249, 115, 22, 0.12)',
        stroke: 'rgba(249, 115, 22, 0.90)',
      },
    ],
    []
  );

  // Отступы до забора
  const FENCE_SETBACK_M: Record<PlantType, number> = useMemo(
    () => ({
      oak: 4,
      spruce: 4,

      birch: 2,
      apple: 2,

      thuja: 1,

      carrot: 0,
      cabbage: 0,
      pumpkin: 0,
      tomato: 0,
    }),
    []
  );

  // Отступы до дома
  const HOUSE_SETBACK_M: Record<PlantType, number> = useMemo(
    () => ({
      oak: 5,
      spruce: 5,

      birch: 5,
      apple: 5,

      thuja: 1.5,

      carrot: 0,
      cabbage: 0,
      pumpkin: 0,
      tomato: 0,
    }),
    []
  );

  const persist = (nextPlants: StoredPlant[]) => {
    saveToStorage({
      plotWidth,
      plotLength,
      house: initial.house ?? null,
      buildings: initial.buildings ?? [],
      plants: nextPlants.map((p) => ({
        id: p.id,
        type: p.type,
        width: p.width,
        length: p.length,
        x: p.x,
        y: p.y,
      })),
      currentScreen: 'plants',
    });
  };

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

    // Постройки — показываем и учитываем для коллизий
    for (const b of initial.buildings ?? []) {
      const t = String(b.type) as BuildingType;
      const title = BUILDING_LABELS[t] ?? 'Постройка';

      out.push({
        id: b.id,
        kind: 'rect',
        x: b.x,
        y: b.y,
        w: b.width,
        h: b.length,
        label: title,
        fill: 'rgba(59, 130, 246, 0.08)',
        stroke: 'rgba(59, 130, 246, 0.55)',
      });
    }

    for (const p of plants) {
      const preset = PRESETS.find((x) => x.type === (p.type as PlantType));
      out.push({
        id: p.id,
        kind: 'rect',
        x: p.x,
        y: p.y,
        w: p.width,
        h: p.length,
        label: preset?.title ?? 'Насаждение',
        fill: preset?.fill ?? 'rgba(34, 197, 94, 0.12)',
        stroke: preset?.stroke ?? 'rgba(34, 197, 94, 0.85)',
      });
    }

    return out;
  }, [plants, PRESETS, initial.house, initial.buildings]);

  const validateCandidate = (candidate: GridObject, type: PlantType, ignoreId?: string) => {
    const a = getAabb(candidate);

    // 1) влезть в участок
    if (a.minX < 0 || a.minY < 0 || a.maxX > plotWidth || a.maxY > plotLength) {
      return { ok: false as const, msg: 'Объект не влезает в участок' };
    }

    // 2) отступ до забора
    const fenceS = FENCE_SETBACK_M[type] ?? 0;
    if (fenceS > 0) {
      if (a.minX < fenceS || a.minY < fenceS || a.maxX > plotWidth - fenceS || a.maxY > plotLength - fenceS) {
        return { ok: false as const, msg: `Нужно отступить от забора минимум ${fenceS} м` };
      }
    }

    // 3) пересечения + отступ до дома
    for (const o of objects) {
      if (ignoreId && o.id === ignoreId) continue;

      let padding = 0;

      if (o.id === 'house') {
        const hs = HOUSE_SETBACK_M[type] ?? 0;
        if (hs > 0) padding = hs;
      }

      const b = getAabb(o);
      if (aabbIntersects(a, b, padding)) {
        if (padding > 0 && o.id === 'house') {
          return { ok: false as const, msg: `Нужно выдержать расстояние до дома минимум ${padding} м` };
        }
        return { ok: false as const, msg: 'Нельзя разместить объект поверх другого' };
      }
    }

    return { ok: true as const, msg: '' };
  };

  const openSheet = () => {
    setSheetOpen(true);
    setPlaceMode(false);
    setSelected(null);
  };

  const startPlace = (type: PlantType) => {
    setSelected(type);
    setPlaceMode(true);
    setSheetOpen(false);
    setNotice('Тапни по сетке, чтобы поставить насаждение');
  };

  const placeAt = (pos: { xM: number; yM: number }) => {
    if (!placeMode || !selected) return;

    const preset = PRESETS.find((p) => p.type === selected);
    if (!preset) return;

    const halfW = preset.width / 2;
    const halfL = preset.length / 2;

    let x = snap(pos.xM - halfW, GRID_CELL_SIZE_M) + halfW;
    let y = snap(pos.yM - halfL, GRID_CELL_SIZE_M) + halfL;

    x = clamp(x, halfW, plotWidth - halfW);
    y = clamp(y, halfL, plotLength - halfL);

    const id = `plt-${selected}-${Date.now()}`;

    const candidate: GridObject = {
      id,
      kind: 'rect',
      x,
      y,
      w: preset.width,
      h: preset.length,
    };

    const v = validateCandidate(candidate, selected, id);
    if (!v.ok) {
      setNotice(v.msg);
      return;
    }

    const next: StoredPlant[] = [
      ...plants,
      {
        id,
        type: preset.type,
        width: preset.width,
        length: preset.length,
        x,
        y,
      },
    ];

    setPlants(next);
    persist(next);

    setPlaceMode(false);
    setSelected(null);
    setNotice('Насаждение добавлено');
  };

  const handleMoveObject = (id: string, nextPos: { x: number; y: number }) => {
    if (id === 'house') return;

    // В этом экране не двигаем постройки
    if (id.startsWith('bld-')) return;

    const idx = plants.findIndex((p) => p.id === id);
    if (idx < 0) return;

    const current = plants[idx];
    const t = (current.type as PlantType) ?? null;
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
    };

    const v = validateCandidate(candidate, t, id);
    if (!v.ok) {
      setNotice(v.msg);
      return;
    }

    const next = plants.slice();
    next[idx] = { ...current, x, y };

    setPlants(next);
    persist(next);
  };

  const handleDeleteAll = () => {
    setPlants([]);
    persist([]);
    setNotice('Все насаждения удалены');
  };

  const handleNext = () => {
    saveToStorage({
      plotWidth,
      plotLength,
      house: initial.house ?? null,
      buildings: initial.buildings ?? [],
      plants: plants.map((p) => ({
        id: p.id,
        type: p.type,
        width: p.width,
        length: p.length,
        x: p.x,
        y: p.y,
      })),
      currentScreen: 'summary',
    });

    onNavigate('summary');
  };

  return (
    <div className="plants-screen">
      <div className="plants-grid-bg">
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
        season="summer"
        title="Насаждения"
        progress={{ current: 4, total: 6 }}
        onBack={() => onNavigate('menu')}
        onOpenInfo={() => setNormsOpen(true)}
      />


      <FooterBar
        leftLabel="3D вид"
        leftIcon={`assets/icons/ui/3D.svg`}
        onLeft={() => onNavigate('view3d')}
        centerLabel="Добавить насаждение"
        centerIcon={`assets/icons/oak.svg`}
        onCenter={openSheet}
        rightLabel="Далее"
        onRight={handleNext}
        rightDisabled={false}
      />
<NormsModal open={normsOpen} onClose={() => setNormsOpen(false)} />

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Насаждения" height="md">
        <div className="plants-sheet">
          <div className="plants-sheet-head">
            <div className="plants-sheet-sub">
              Карточка → тап по сетке.
              <br />
              Нормы: дуб/ель ≥ 4м до забора и ≥ 5м до дома, берёза/яблоня ≥ 2м и ≥ 5м, туя ≥ 1м и ≥ 1.5м.
            </div>

            {plants.length > 0 ? (
              <button type="button" className="plants-danger" onClick={handleDeleteAll}>
                Удалить все
              </button>
            ) : null}
          </div>

          <div className="plants-cards">
            {PRESETS.map((p) => {
              const area = p.width * p.length;
              return (
                <button key={p.type} type="button" className="pcard" onClick={() => startPlace(p.type)}>
                  <div className="pcard-top">
                    <div className="pcard-emoji">
  <img src={p.emoji} alt={p.title} className="pcard-icon" />
</div>

                    <div className="pcard-title">{p.title}</div>
                  </div>

                  <div className="pcard-sub">{p.subtitle}</div>

                  <div className="pcard-meta">
                    <span className="pmeta-pill">
                      {p.width}×{p.length} м
                    </span>
                    <span className="pmeta-pill">{area} м²</span>
                  </div>

                  <div className="pcard-cta">Поставить</div>
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
