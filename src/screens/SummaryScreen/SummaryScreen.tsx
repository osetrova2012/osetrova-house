import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header/Header';
import Grid, { type GridObject } from '../../components/Grid/Grid';

import { getInitialState, loadFromStorage, saveToStorage } from '../../storage/storage';
import type { ScreenType } from '../../types';

import './SummaryScreen.css';
import NormsModal from '../../components/NormsModal/NormsModal';

const View3DScreen = lazy(() => import('../View3dScreen/View3dScreen'));

interface SummaryScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

type SeasonKey = 'winter' | 'spring' | 'summer' | 'autumn';

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
  rotation?: number;
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

/**
 * Экспорт в SVG (без внешних библиотек):
 * - берём canvas из Grid
 * - делаем PNG dataURL
 * - пакуем PNG внутрь SVG как <image href="data:image/png;base64,...">
 * - скачиваем .svg
 *
 * Почему так:
 * Grid рисуется в canvas, поэтому "честный вектор" тут не извлечь без переписывания Grid на SVG.
 * Но SVG-файл будет именно .svg и откроется в Illustrator/Figma/браузере.
 */
function exportGridToSvg(rootEl: HTMLElement | null, filename = 'osetrova-house-scheme.svg') {
  if (!rootEl) return;

  const canvas = rootEl.querySelector('canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    alert('Не нашёл canvas для экспорта. Если структура Grid поменялась — скинь Grid.tsx, подстрою экспорт.');
    return;
  }

  try {
    // Берём "картинку" текущего canvas
    const pngDataUrl = canvas.toDataURL('image/png');

    // Размеры берём из CSS-реальных (чтобы SVG открывался “как на экране”)
    const width = Math.max(1, Math.round(canvas.clientWidth || canvas.width));
    const height = Math.max(1, Math.round(canvas.clientHeight || canvas.height));

    const svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}"
     viewBox="0 0 ${width} ${height}">
  <image x="0" y="0" width="${width}" height="${height}" href="${pngDataUrl}" xlink:href="${pngDataUrl}" />
</svg>`;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    // чуть позже освобождаем ссылку
    setTimeout(() => URL.revokeObjectURL(url), 500);
  } catch (e) {
    console.error(e);
    alert('Не удалось экспортировать SVG (ошибка в консоли).');
  }
}

export default function SummaryScreen({ onNavigate }: SummaryScreenProps) {
  const [normsOpen, setNormsOpen] = useState(false);

  const [initial] = useState(() => loadFromStorage() ?? getInitialState());

  const [is3d, setIs3d] = useState(false);

  // По ТЗ: сверху сезон "Осень"
  const season: SeasonKey = 'autumn';

  const plotWidth = initial.plotWidth;
  const plotLength = initial.plotLength;

  const PRESETS: Preset[] = useMemo(
    () => [
      // Деревья
      {
        type: 'oak',
        title: 'Дуб',
        subtitle: 'Высокое дерево',
        width: 4,
        length: 4,
        emoji: '🌳',
        fill: 'rgba(34, 197, 94, 0.14)',
        stroke: 'rgba(34, 197, 94, 0.85)',
      },
      {
        type: 'birch',
        title: 'Берёза',
        subtitle: 'Среднее дерево',
        width: 3,
        length: 3,
        emoji: '🌿',
        fill: 'rgba(16, 185, 129, 0.14)',
        stroke: 'rgba(16, 185, 129, 0.85)',
      },
      {
        type: 'apple',
        title: 'Яблоня',
        subtitle: 'Среднее дерево',
        width: 3,
        length: 3,
        emoji: '🍎',
        fill: 'rgba(34, 197, 94, 0.12)',
        stroke: 'rgba(34, 197, 94, 0.85)',
      },
      {
        type: 'thuja',
        title: 'Туя',
        subtitle: 'Куст/живая изгородь',
        width: 2,
        length: 2,
        emoji: '🌲',
        fill: 'rgba(20, 184, 166, 0.14)',
        stroke: 'rgba(20, 184, 166, 0.90)',
      },
      {
        type: 'spruce',
        title: 'Ель',
        subtitle: 'Высокое дерево',
        width: 4,
        length: 4,
        emoji: '🎄',
        fill: 'rgba(5, 150, 105, 0.14)',
        stroke: 'rgba(5, 150, 105, 0.90)',
      },

      // Овощи
      {
        type: 'carrot',
        title: 'Морковь',
        subtitle: 'Овощи (грядка 1×2)',
        width: 1,
        length: 2,
        emoji: '🥕',
        fill: 'rgba(245, 158, 11, 0.12)',
        stroke: 'rgba(245, 158, 11, 0.90)',
      },
      {
        type: 'tomato',
        title: 'Помидоры',
        subtitle: 'Овощи (грядка 1×3)',
        width: 1,
        length: 3,
        emoji: '🍅',
        fill: 'rgba(239, 68, 68, 0.10)',
        stroke: 'rgba(239, 68, 68, 0.90)',
      },
      {
        type: 'cabbage',
        title: 'Капуста',
        subtitle: 'Овощи (грядка 2×6)',
        width: 2,
        length: 6,
        emoji: '🥬',
        fill: 'rgba(132, 204, 22, 0.12)',
        stroke: 'rgba(132, 204, 22, 0.90)',
      },
      {
        type: 'pumpkin',
        title: 'Тыква',
        subtitle: 'Овощи (грядка 2×6)',
        width: 2,
        length: 6,
        emoji: '🎃',
        fill: 'rgba(249, 115, 22, 0.12)',
        stroke: 'rgba(249, 115, 22, 0.90)',
      },
    ],
    []
  );

  // Нормализация plants “как в PlantsScreen”
  const storedPlants: StoredPlant[] = useMemo(() => {
    return (
      initial.plants?.map((p) => ({
        id: String(p.id),
        type: String(p.type),
        width: Number(p.width) || Number(p.size) || 1,
        length: Number(p.length) || Number(p.size) || 1,
        x: Number(p.x) || 1,
        y: Number(p.y) || 1,
        rotation: Number.isFinite(p.rotation) ? Number(p.rotation) : 0,
      })) ?? []
    );
  }, [initial.plants]);

  const objects: GridObject[] = useMemo(() => {
    const out: GridObject[] = [];

    // Дом — серый
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

    // Постройки — синие + русские названия
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

    // Растения/овощи — цвета/названия из PRESETS
    for (const p of storedPlants) {
      const preset = PRESETS.find((x) => x.type === (p.type as PlantType));

      out.push({
        id: p.id,
        kind: 'rect',
        x: p.x,
        y: p.y,
        w: p.width,
        h: p.length,
        rotation: Number.isFinite(p.rotation) ? Number(p.rotation) : 0,
        label: preset?.title ?? 'Насаждение',
        fill: preset?.fill ?? 'rgba(34, 197, 94, 0.12)',
        stroke: preset?.stroke ?? 'rgba(34, 197, 94, 0.85)',
      });
    }

    return out;
  }, [initial.house, initial.buildings, storedPlants, PRESETS]);

  // фиксируем currentScreen = summary
  useEffect(() => {
    try {
      saveToStorage({
        plotWidth,
        plotLength,
        house: initial.house ?? null,
        buildings: initial.buildings ?? [],
        plants: storedPlants.map((p) => ({
          id: p.id,
          type: p.type,
          width: p.width,
          length: p.length,
          x: p.x,
          y: p.y,
          rotation: p.rotation ?? 0,
        })),
        currentScreen: 'summary',
      });
    } catch {
      // не критично
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportSvg = () => {
    const root = document.querySelector('.summary-grid-bg') as HTMLElement | null;
    exportGridToSvg(root, 'osetrova-house-scheme.svg');
  };

  const onHarvest = () => alert('Сбор урожая: заглушка. Позже прикрутим логику.');
  const onSeasonSwitch = () => alert('Переключение сезона: заглушка. Позже будет менять окружение.');

  // ===== 3D MODE =====
  if (is3d) {
    return (
      <div className="summary-3d">
        <Suspense fallback={<div className="summary-3d-loading" />}>
          <View3DScreen onBack={() => setIs3d(false)} />
        </Suspense>

        <div className="summary-3d-overlay">
          <div className="summary-3d-topbar">
            <button
              className="summary-3d-btn primary"
              type="button"
              onClick={onHarvest}
              disabled={season !== 'autumn'}
              title={season !== 'autumn' ? 'Доступно только осенью' : 'Заглушка'}
            >
              🌾 Сбор урожая
            </button>

            <button className="summary-3d-btn" type="button" onClick={onSeasonSwitch} title="Заглушка">
              🍂 Сезон
            </button>

            <button className="summary-3d-btn ghost" type="button" onClick={() => setIs3d(false)} title="Вернуться в 2D">
              ⟵ 2D
            </button>
          </div>

          <div className="summary-3d-sidecard">
            <div className="summary-3d-card-title">Обустройство дома</div>

            <div className="summary-3d-card-actions">
              <button className="summary-3d-card-btn" type="button" onClick={() => alert('Видеонаблюдение: заглушка')}>
                📷 Установить видеонаблюдение
              </button>

              <button className="summary-3d-card-btn" type="button" onClick={() => alert('Умный дом: заглушка')}>
                🧠 Монтаж элементов умного дома
              </button>
            </div>

            <div className="summary-3d-card-note">
              Сейчас это заглушки. Потом сюда привяжем реальные модели/состояния.
            </div>
          </div>
        </div>

        {/* ✅ Нормы работают и в 3D */}
        <NormsModal open={normsOpen} onClose={() => setNormsOpen(false)} />
      </div>
    );
  }

  // ===== 2D MODE =====
  return (
    <div className="summary-screen">
      <div className="summary-grid-bg">
        <Grid
          plotWidthM={plotWidth}
          plotLengthM={plotLength}
          objects={objects}
          showTerrainDecor
          redLineOffsetM={2}
          redLineLabel="Красная линия улицы"
          neighborLabel="Соседний участок"
        />
      </div>

      <Header
        season={season}
        title="Итоговый план"
        progress={{ current: 6, total: 6 }}
        onBack={() => onNavigate('menu')}
        onOpenInfo={() => setNormsOpen(true)}
      />

      {/* ✅ Две кнопки внизу, без центральной */}
      <div className="summary-footer">
        <button className="summary-footer-btn" type="button" onClick={() => setIs3d(true)}>
          <span className="summary-footer-ico">3D</span>
          <span className="summary-footer-text">Взаимодействие в 3D</span>
        </button>

        <button className="summary-footer-btn primary" type="button" onClick={handleExportSvg}>
          <span className="summary-footer-ico">SVG</span>
          <span className="summary-footer-text">Экспорт схемы в SVG</span>
        </button>
      </div>

      {/* ✅ Нормы работают и в 2D */}
      <NormsModal open={normsOpen} onClose={() => setNormsOpen(false)} />
    </div>
  );
}
