import { useEffect, useMemo, useState } from 'react';
import Header from '../../components/Header/Header';
import Grid from '../../components/Grid/Grid';
import FooterBar from '../../components/FooterBar/FooterBar';
import BottomSheet from '../../components/BottomSheet/BottomSheet';
import NormsModal from '../../components/NormsModal/NormsModal';


import {
  //MAX_PLOT_AREA_M2,
  MIN_PLOT_AREA_M2,
  MIN_PLOT_WIDTH_M,
} from '../../utils/constants';

import { getInitialState, loadFromStorage, saveToStorage } from '../../storage/storage';
import type { ScreenType } from '../../types';

import './TerrainScreen.css';

interface TerrainScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

/**
 * Квантуем строго по чётным значениям: 10,12,14,...,60
 * и одновременно клампим в [min..max].
 */
function clampEven(value: number, min: number, max: number) {
  const v = Number.isFinite(value) ? value : min;
  const even = Math.round(v / 2) * 2;
  return Math.max(min, Math.min(max, even));
}

export default function TerrainScreen({ onNavigate }: TerrainScreenProps) {
  const [normsOpen, setNormsOpen] = useState(false);

  const [initial] = useState(() => loadFromStorage() ?? getInitialState());

  // Коммитнутые размеры участка
  const [plotWidth, setPlotWidth] = useState<number>(initial.plotWidth);
  const [plotLength, setPlotLength] = useState<number>(initial.plotLength);

  const [, setLastTap] = useState<{ xM: number; yM: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Draft для превью в BottomSheet
  const [draftWidth, setDraftWidth] = useState<number>(initial.plotWidth);
  const [draftLength, setDraftLength] = useState<number>(initial.plotLength);

  // При открытии шита — синхронизируем ползунки с текущим коммитом
  useEffect(() => {
    if (!sheetOpen) return;
    setDraftWidth(plotWidth);
    setDraftLength(plotLength);
  }, [sheetOpen, plotWidth, plotLength]);

  // Диапазоны ползунков: только 10..60 и только чётные
  const MAX_W = 60;
  const MAX_L = 60;

  // нижние границы — не меньше 10 и чётные
  const MIN_W = clampEven(Math.max(MIN_PLOT_WIDTH_M, 10), 10, MAX_W);
  const MIN_L = 10;

  // Превью: когда шит открыт — показываем draft на гриде и в хинтах
  const effectiveWidth = sheetOpen ? draftWidth : plotWidth;
  const effectiveLength = sheetOpen ? draftLength : plotLength;

  const effectiveAreaM2 = useMemo(
    () => effectiveWidth * effectiveLength,
    [effectiveWidth, effectiveLength]
  );

  const sotkas = useMemo(() => effectiveAreaM2 / 100, [effectiveAreaM2]);

  // Блокировка “Далее” — по коммитнутым значениям (чтобы draft не ломал навигацию)
  const committedAreaM2 = useMemo(() => plotWidth * plotLength, [plotWidth, plotLength]);
  const committedHasHardErrors = useMemo(() => {
    if (committedAreaM2 < MIN_PLOT_AREA_M2) return true;
    return false;
  }, [committedAreaM2]);

  const handleNext = () => {
    const nextState = {
      plotWidth,
      plotLength,
      house: initial.house ?? null,
      buildings: initial.buildings ?? [],
      plants: initial.plants ?? [],
      currentScreen: 'house' as const,
    };

    saveToStorage(nextState);
    onNavigate('house');
  };

  const applyDraft = () => {
    // финальный кламп тоже по чётным — чтобы в storage не улетали “кривые” значения
    const w = clampEven(draftWidth, MIN_W, MAX_W);
    const l = clampEven(draftLength, MIN_L, MAX_L);

    setPlotWidth(w);
    setPlotLength(l);

    // Сохраняем сразу, чтобы “Продолжить” работало даже после обновления страницы
    saveToStorage({
      plotWidth: w,
      plotLength: l,
      house: initial.house ?? null,
      buildings: initial.buildings ?? [],
      plants: initial.plants ?? [],
      currentScreen: 'terrain',
    });

    setSheetOpen(false);
  };

  return (
    <div className="terrain-screen">
      {/* Сетка фоном */}
      <div className="terrain-grid-bg">
        <Grid
          plotWidthM={effectiveWidth}
          plotLengthM={effectiveLength}
          onTapCell={(pos) => setLastTap(pos)}
          showTerrainDecor
          redLineOffsetM={2}
          redLineLabel="Красная линия улицы"
          neighborLabel="Соседний участок"
        />
      </div>

      <Header
        season="winter"
        title="Создание участка"
        progress={{ current: 1, total: 6 }}
        onBack={() => onNavigate('menu')}
        onOpenInfo={() => setNormsOpen(true)}
      />

      <FooterBar
        leftLabel="3D вид"
        leftIcon={`assets/icons/ui/3D.svg`}
        onLeft={() => onNavigate('view3d')}
        centerLabel="Границы"
        centerIcon={`assets/icons/ui/borders.svg`}
        onCenter={() => setSheetOpen(true)}
        rightLabel="Далее"
        onRight={handleNext}
        rightDisabled={committedHasHardErrors}
      />
<NormsModal open={normsOpen} onClose={() => setNormsOpen(false)} />

      {/* BottomSheet — ЗИМА: только ползунки + сотки + подтвердить */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Границы участка"
        height="md"
      >
        <div className="winter-sheet">
          <div className="winter-top">
            <div className="winter-title">Размеры участка</div>
            <div className="winter-sotka">{sotkas.toFixed(1)} сот.</div>
          </div>

          <div className="winter-block">
            <div className="winter-row">
              <div className="winter-label">Ширина</div>
              <div className="winter-value">{draftWidth} м</div>
            </div>

            <input
              className="winter-range"
              type="range"
              min={MIN_W}
              max={MAX_W}
              step={2}
              value={draftWidth}
              onChange={(e) =>
                setDraftWidth(clampEven(Number(e.target.value), MIN_W, MAX_W))
              }
            />

            <div className="winter-minmax">
              <span>{MIN_W} м</span>
              <span>{MAX_W} м</span>
            </div>
          </div>

          <div className="winter-block">
            <div className="winter-row">
              <div className="winter-label">Длина</div>
              <div className="winter-value">{draftLength} м</div>
            </div>

            <input
              className="winter-range"
              type="range"
              min={MIN_L}
              max={MAX_L}
              step={2}
              value={draftLength}
              onChange={(e) =>
                setDraftLength(clampEven(Number(e.target.value), MIN_L, MAX_L))
              }
            />

            <div className="winter-minmax">
              <span>{MIN_L} м</span>
              <span>{MAX_L} м</span>
            </div>
          </div>

          <button className="winter-confirm" type="button" onClick={applyDraft}>
            Подтвердить
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
