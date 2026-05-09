import { lazy, Suspense, useState } from 'react';
import type { ScreenType } from './types';
import './App.css';

const MainMenu = lazy(() => import('./screens/MainMenu/MainMenu'));
const TerrainScreen = lazy(() => import('./screens/TerrainScreen/TerrainScreen'));
const HouseScreen = lazy(() => import('./screens/HouseScreen/HouseScreen'));
const BuildingsScreen = lazy(() => import('./screens/BuildingsScreen/BuildingsScreen'));
const PlantsScreen = lazy(() => import('./screens/PlantsScreen/PlantsScreen'));
const SummaryScreen = lazy(() => import('./screens/SummaryScreen/SummaryScreen'));
const View3DScreen = lazy(() => import('./screens/View3dScreen/View3dScreen'));

function App() {
  const [screen, setScreen] = useState<ScreenType>('menu');
  const [lastEditorScreen, setLastEditorScreen] = useState<ScreenType>('terrain');

  const navigate = (next: ScreenType) => {
    if (next === 'view3d') {
      // запоминаем откуда ушли в 3D (только если мы НЕ уже в 3D)
      if (screen !== 'view3d') setLastEditorScreen(screen);
      setScreen('view3d');
      return;
    }
    setScreen(next);
  };

  const renderScreen = () => {
    switch (screen) {
      case 'menu':
        return <MainMenu onNavigate={navigate} />;

      case 'terrain':
        return <TerrainScreen onNavigate={navigate} />;

      case 'house':
        return <HouseScreen onNavigate={navigate} />;

      case 'view3d':
        return <View3DScreen onBack={() => setScreen(lastEditorScreen)} />;

      case 'buildings':
        return <BuildingsScreen onNavigate={navigate} />;

      case 'plants':
        return <PlantsScreen onNavigate={navigate} />;

      case 'summary':
      return <SummaryScreen onNavigate={navigate} />;


      default:
        return <MainMenu onNavigate={navigate} />;
    }
  };

  return (
    <div className="app">
      <Suspense fallback={<div className="app-loading" />}>{renderScreen()}</Suspense>
    </div>
  );
}

export default App;
