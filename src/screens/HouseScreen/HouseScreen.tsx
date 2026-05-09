import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header/Header';
import Grid, { type GridObject } from '../../components/Grid/Grid';
import FooterBar from '../../components/FooterBar/FooterBar';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import NormsModal from '../../components/NormsModal/NormsModal';


import { loadFromStorage, saveToStorage, getInitialState } from '../../storage/storage';
import type { ScreenType } from '../../types';

import { GRID_CELL_SIZE_M } from '../../utils/constants';

import './HouseScreen.css';

type HouseMaterial = 'brick' | 'wood';
type HouseSizeKind = 'square' | 'rect';

function clampInt(v: number, min: number, max: number) {
  const n = Number.isFinite(v) ? v : min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export default function HouseScreen({ onNavigate }: { onNavigate: (s: ScreenType) => void }) {
  const [normsOpen, setNormsOpen] = useState(false);

  const [initial] = useState(() => loadFromStorage() ?? getInitialState());

  const [plotWidth] = useState(initial.plotWidth);
  const [plotLength] = useState(initial.plotLength);

  const [sheetOpen, setSheetOpen] = useState(false);

  const [house, setHouse] = useState(initial.house);
  const [placeMode, setPlaceMode] = useState(false);

  // ✅ материал: только brick/wood
  const [material, setMaterial] = useState<HouseMaterial>(() => {
    const m = String(house?.material ?? '').toLowerCase();
    return m.includes('wood') || m.includes('дерев') ? 'wood' : 'brick';
  });

  const [floors, setFloors] = useState<number>(house?.floors ?? 1);

  // ✅ размеры: только 2 пресета
  const HOUSE_SIZES = useMemo(
    () => ({
      square: { w: 10, l: 10, label: 'Квадрат' },
      rect: { w: 10, l: 20, label: 'Прямоугольник' },
    }),
    []
  );

  const inferSizeKind = (w?: number, l?: number): HouseSizeKind => {
    const ww = Math.max(0.0001, Number(w) || 0);
    const ll = Math.max(0.0001, Number(l) || 0);
    const maxSide = Math.max(ww, ll);
    const minSide = Math.min(ww, ll);
    const ratio = maxSide / minSide;

    // допуск вокруг 2:1
    const is2to1 = Math.abs(ratio - 2) <= 0.2;
    return is2to1 ? 'rect' : 'square';
  };

  const [sizeKind, setSizeKind] = useState<HouseSizeKind>(() =>
    inferSizeKind(house?.width, house?.length)
  );

  const pickedSize = HOUSE_SIZES[sizeKind];
  const hWidth = pickedSize.w;
  const hLength = pickedSize.l;

  // мини-тост (сам исчезает)
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (!sheetOpen) return;
    if (!house) return;

    const m = String(house.material ?? '').toLowerCase();
    setMaterial(m.includes('wood') || m.includes('дерев') ? 'wood' : 'brick');

    setFloors(house.floors ?? 1);
    setSizeKind(inferSizeKind(house.width, house.length));
  }, [sheetOpen, house]);


  const houseFill = useMemo(() => {
    if (material === 'brick') return 'rgba(245, 158, 11, 0.18)';
    return 'rgba(34, 197, 94, 0.16)';
  }, [material]);

  const houseStroke = useMemo(() => {
    if (material === 'brick') return 'rgba(245, 158, 11, 0.9)';
    return 'rgba(34, 197, 94, 0.9)';
  }, [material]);

  const objects: GridObject[] = useMemo(() => {
    if (!house) return [];
    return [
      {
        id: 'house',
        kind: 'rect',
        x: house.x,
        y: house.y,
        w: house.width,
        h: house.length,
        label: `Дом • ${house.floors} эт.`,
        fill: houseFill,
        stroke: houseStroke,
      },
    ];
  }, [house, houseFill, houseStroke]);

  const persist = (nextHouse: typeof house) => {
    saveToStorage({
      plotWidth,
      plotLength,
      house: nextHouse,
      buildings: initial.buildings ?? [],
      plants: initial.plants ?? [],
      currentScreen: 'house',
    });
  };

  const openHouseSheet = () => {
    setSheetOpen(true);
    setPlaceMode(false);
  };

  const snap = (v: number, step: number) => Math.round(v / step) * step;

  const placeAt = (pos: { xM: number; yM: number }) => {
    if (!placeMode) return;
    if (!house) return;

    const cell = GRID_CELL_SIZE_M;
    const halfW = house.width / 2;
    const halfL = house.length / 2;

    // снэп по левому верхнему углу
    let x = snap(pos.xM - halfW, cell) + halfW;
    let y = snap(pos.yM - halfL, cell) + halfL;

    // кламп в пределах участка
    x = Math.max(halfW, Math.min(plotWidth - halfW, x));
    y = Math.max(halfL, Math.min(plotLength - halfL, y));

    const next = { ...house, x, y };
    setHouse(next);
    persist(next);
    setPlaceMode(false);
  };

  const handleConfirmHouse = () => {
    const w = hWidth;
    const l = hLength;
    const f = clampInt(floors, 1, 3);

    const halfW = w / 2;
    const halfL = l / 2;

    const preferred = house
      ? { xM: house.x, yM: house.y }
      : { xM: plotWidth / 2, yM: plotLength / 2 };

    let x = snap(preferred.xM - halfW, GRID_CELL_SIZE_M) + halfW;
    let y = snap(preferred.yM - halfL, GRID_CELL_SIZE_M) + halfL;

    x = Math.max(halfW, Math.min(plotWidth - halfW, x));
    y = Math.max(halfL, Math.min(plotLength - halfL, y));

    const next = {
      width: w,
      length: l,
      floors: f,
      material, // brick|wood
      x,
      y,
      rotation: 0,
    };

    setHouse(next);
    persist(next);

    setPlaceMode(false);
    setSheetOpen(false);
  };

  const handleMoveObject = (id: string, nextPos: { x: number; y: number }) => {
    if (id !== 'house' || !house) return;

    const halfW = house.width / 2;
    const halfL = house.length / 2;

    const x = Math.max(halfW, Math.min(plotWidth - halfW, nextPos.x));
    const y = Math.max(halfL, Math.min(plotLength - halfL, nextPos.y));

    const next = { ...house, x, y };
    setHouse(next);
    persist(next);
  };

  const handleNext = () => {
    if (!house) {
      setSheetOpen(true);
      return;
    }

    saveToStorage({
      plotWidth,
      plotLength,
      house,
      buildings: initial.buildings ?? [],
      plants: initial.plants ?? [],
      currentScreen: 'buildings',
    });

    onNavigate('buildings');
  };

  return (
    <div className="house-screen">
      <div className="house-grid-bg">
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
        title="Дом"
        progress={{ current: 2, total: 6 }}
        onBack={() => onNavigate('menu')}
        onOpenInfo={() => setNormsOpen(true)}
      />

  

      <FooterBar
        leftLabel="3D вид"
        leftIcon={`assets/icons/ui/3D.svg`}
        onLeft={() => onNavigate('view3d')}
        centerLabel={house ? 'Дом' : 'Добавить дом'}
        centerIcon={`assets/icons/house_wood_1.svg`}
        onCenter={openHouseSheet}
        rightLabel="Далее"
        onRight={handleNext}
        rightDisabled={false}
      />
<NormsModal open={normsOpen} onClose={() => setNormsOpen(false)} />

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Дом" height="md">
        <div className="spring-sheet">
          <div className="spring-section">
            <div className="spring-section-title">Размер</div>
            <div className="spring-chips">
              <button
                type="button"
                className={`chip ${sizeKind === 'square' ? 'is-active' : ''}`}
                onClick={() => setSizeKind('square')}
              >
                {HOUSE_SIZES.square.label} • {HOUSE_SIZES.square.w}×{HOUSE_SIZES.square.l} м
              </button>

              <button
                type="button"
                className={`chip ${sizeKind === 'rect' ? 'is-active' : ''}`}
                onClick={() => setSizeKind('rect')}
              >
                {HOUSE_SIZES.rect.label} • {HOUSE_SIZES.rect.w}×{HOUSE_SIZES.rect.l} м
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>
              Выбрано: <b>{hWidth}×{hLength} м</b> • <b>{hWidth * hLength} м²</b>
            </div>
          </div>

          <div className="spring-section">
            <div className="spring-section-title">Материал</div>
            <div className="spring-chips">
              <button
                type="button"
                className={`chip ${material === 'brick' ? 'is-active' : ''}`}
                onClick={() => setMaterial('brick')}
              >
                Кирпич
              </button>
              <button
                type="button"
                className={`chip ${material === 'wood' ? 'is-active' : ''}`}
                onClick={() => setMaterial('wood')}
              >
                Дерево
              </button>
            </div>
          </div>

          <div className="spring-section">
            <div className="spring-section-title">Этажность</div>
            <div className="spring-seg">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`seg-btn ${floors === n ? 'is-active' : ''}`}
                  onClick={() => setFloors(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button className="spring-confirm" type="button" onClick={handleConfirmHouse}>
            Подтвердить и поставить
          </button>
        </div>
      </BottomSheet>

      {notice ? <div className="toast">{notice}</div> : null}
    </div>
  );
}
