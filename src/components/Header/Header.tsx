import type { Season } from '../../types';
import './Header.css';

interface HeaderProps {
  season: Season;

  /** Необязательно: заголовок экрана справа/слева от сезона */
  title?: string;

  /** Прогресс этапов (например 1 из 6) — необязательно */
  progress?: {
    current: number; // 1..total
    total: number;   // 1..n
  };

  /** Кнопка назад (если нужно) */
  onBack?: () => void;

  /** Открыть справку/нормы */
  onOpenInfo: () => void;
}

const SEASON_UI: Record<Season, { label: string; iconSrc: string }> = {
  winter: { label: 'Зима', iconSrc: 'assets/icons/ui/winter.svg' },
  spring: { label: 'Весна', iconSrc: 'assets/icons/ui/spring.svg' },
  summer: { label: 'Лето', iconSrc: 'assets/icons/ui/summer.svg' },
  autumn: { label: 'Осень', iconSrc: 'assets/icons/ui/autumn.svg' },
};

export default function Header({
  season,
  title,
  progress,
  onOpenInfo,
}: HeaderProps) {
  const s = SEASON_UI[season];

  const progressPercent =
    progress && progress.total > 0
      ? Math.max(0, Math.min(100, (progress.current / progress.total) * 100))
      : null;

  return (
    <header className="app-header">
      <div className="header-row">
        <div className="header-left" aria-hidden="true" />

        {/* СЕЗОН — НЕ кликабельный (просто “плашка”) */}
        <div className="header-center">
          <div className="header-season" aria-label={`Сезон: ${s.label}`}>
            <img
              className="header-season-img"
              src={s.iconSrc}
              alt=""
              aria-hidden="true"
            />
            <span className="header-season-text">{s.label}</span>
          </div>

          {title ? <div className="header-title">{title}</div> : null}
        </div>

        {/* НОРМЫ — кликабельная кнопка */}
        <div className="header-right">
          <button
  className="header-norms-btn"
  onClick={onOpenInfo}
  type="button"
  aria-label="Нормы и справка"
  title="Нормы и справка"
>
  
  <img
    src="assets/icons/ui/norms.svg"
    alt=""
    aria-hidden="true"
    className="header-norms-img"
  />
  <span className="header-norms-text">Нормы</span>
</button>

        </div>
      </div>

      {progressPercent !== null ? (
        <div
          className="header-progress"
          aria-label={`Прогресс: ${progress?.current} из ${progress?.total}`}
        >
          <div className="header-progress-bar">
            <div
              className="header-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="header-progress-text">
            {progress?.current}/{progress?.total}
          </div>
        </div>
      ) : null}
    </header>
  );
}
