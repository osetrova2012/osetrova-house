import { useMemo } from 'react';
import { loadFromStorage, startNewProject } from '../../storage/storage';
import type { ScreenType } from '../../types';
import './MainMenu.css';

interface MainMenuProps {
  onNavigate: (screen: ScreenType) => void;
}

export default function MainMenu({ onNavigate }: MainMenuProps) {
  // читаем один раз на рендер
  const savedState = useMemo(() => loadFromStorage(), []);

  // ✅ “Продолжить” показываем/разрешаем только если это реально НЕ новый проект
  const canContinue =
    !!savedState &&
    (savedState.currentScreen !== 'terrain' ||
      savedState.house !== null ||
      savedState.buildings.length > 0 ||
      savedState.plants.length > 0);

  const handleNewProject = () => {
    startNewProject('terrain');
    onNavigate('terrain');
  };

  const handleContinue = () => {
    if (!savedState) return;
    onNavigate((savedState.currentScreen || 'terrain') as ScreenType);
  };

  return (
    <div className="main-menu">
      {/* Центрированный контент */}
      <div className="menu-content">
        <h1 className="menu-title">
          <span className="menu-title-line">СИМУЛЯТОР</span>
          <span className="menu-title-line">
            ПРОЕКТИРОВАНИЯ <span className="menu-title-accent">ДОМА</span>
          </span>
        </h1>


        <p className="menu-description">
          Бесплатный инструмент для планирования загородного участка.
          <br />
          Расставляйте строения и растения на схеме, соблюдая нормы и смотрите результат в 3D.
        </p>

        <p className="menu-author">
          Учебный проект Осетровой Анны, ученицы 7 класса
        </p>

        <div className="menu-buttons">
          <button className="menu-btn menu-btn-primary" onClick={handleNewProject}>
            Создать новый участок →
          </button>

          <button
            className="menu-btn menu-btn-secondary"
            onClick={handleContinue}
            disabled={!canContinue}
            title={!canContinue ? 'Нет сохранённого проекта' : 'Продолжить сохранённый проект'}
          >
            Продолжить
          </button>
        </div>
      </div>
    </div>
  );
}
