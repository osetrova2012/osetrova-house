import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import './View3dScreen.css';
import { Suspense, useMemo, useRef, useEffect, useState } from 'react';
import {
  InstancedMesh,
  Matrix4,
  Mesh,
  BufferGeometry,
  Material,
  Box3,
  Vector3,
  Group,
} from 'three';

import { loadFromStorage, getInitialState, type PlotState } from '../../storage/storage';
import SceneObjects3D from '../../view3d/sceneObjects3d';
import { selectSceneObjects } from '../../view3d/sceneObjects';

/* ======================================================
   DOM LOADER (поверх Canvas, без Html)
====================================================== */

function View3DLoader() {
  const { active, progress, errors } = useProgress();

  // сглаживаем прогресс, чтобы не дергался и не прыгал "0 -> 100"
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!active) {
      // когда загрузка закончилась — быстро доводим до 100 и прячем
      setShown(100);
      return;
    }

    // во время активной загрузки плавно догоняем реальный progress
    let raf = 0;
    const tick = () => {
      setShown((p) => {
        const target = Math.min(99.5, Math.max(p, progress)); // не даём 100 пока active=true
        const next = p + (target - p) * 0.15;
        return next;
      });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, progress]);

  // показываем только когда реально идёт загрузка
  if (!active && shown >= 100) return null;

  const pct = Math.round(Math.min(100, Math.max(0, shown)));
  const hasError = (errors?.length ?? 0) > 0;

  return (
    <div className="view3d-loader" role="status" aria-live="polite">
      <div className="view3d-loader-card">
        <div className="view3d-loader-title">3D визуализация</div>

        <div className="view3d-loader-bar">
          <div style={{ width: `${pct}%` }} />
        </div>

        <div className="view3d-loader-pct">
          {hasError ? 'Ошибка загрузки ассетов' : `${pct}%`}
        </div>

        {hasError && (
          <div className="view3d-loader-hint">
            Проверь пути к файлам (HDR/GLB) и консоль браузера.
          </div>
        )}
      </div>
    </div>
  );
}

/* ======================================================
   SEASON LOGIC
====================================================== */

type SeasonKey = 'winter' | 'spring' | 'summer' | 'autumn';

function getSeasonByScreen(screen: PlotState['currentScreen']): SeasonKey {
  switch (screen) {
    case 'terrain':
      return 'winter';
    case 'house':
    case 'buildings':
      return 'spring';
    case 'plants':
      return 'summer';
    case 'summary':
      return 'autumn';
    default:
      return 'spring';
  }
}

function getSeasonConfig(season: SeasonKey) {
  const base = import.meta.env.BASE_URL;
  return {
    floorGlbUrl: `${base}assets/glb/terrain/floor/${season}_floor.glb`,
  };
}

const SEASON_LABEL: Record<SeasonKey, string> = {
  winter: 'Зима',
  spring: 'Весна',
  summer: 'Лето',
  autumn: 'Осень',
};

// ✅ твои SVG для сезонов (public/assets/icons/ui/*.svg)
const SEASON_ICON_SRC: Record<SeasonKey, string> = {
  winter: 'assets/icons/ui/winter.svg',
  spring: 'assets/icons/ui/spring.svg',
  summer: 'assets/icons/ui/summer.svg',
  autumn: 'assets/icons/ui/autumn.svg',
};

function nextSeason(s: SeasonKey): SeasonKey {
  const order: SeasonKey[] = ['winter', 'spring', 'summer', 'autumn'];
  const i = order.indexOf(s);
  return order[(i + 1) % order.length] ?? 'spring';
}

/* ======================================================
   LIGHTING (SUN)
====================================================== */

function SunLight({
  x = 120,
  y = 160, // вверх = Y
  z = -100,
  intensity = 3.0,
}: {
  x?: number;
  y?: number;
  z?: number;
  intensity?: number;
}) {
  const lightRef = useRef<THREE.DirectionalLight>(null);

  // отдельный объект-цель (чтобы направление было стабильным)
  const target = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    target.position.set(0, 0, 0); // центр участка
    target.updateMatrixWorld();
  }, [target]);

  return (
    <>
      <primitive object={target} />

      <directionalLight
        ref={lightRef}
        position={[x, y, z]}
        intensity={intensity}
        color="#ffffff"
        castShadow
        target={target}
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={10}
        shadow-camera-far={600}
        shadow-camera-left={-180}
        shadow-camera-right={180}
        shadow-camera-top={180}
        shadow-camera-bottom={-180}
        shadow-bias={-0.0002}
        shadow-normalBias={0.03}
      />
    </>
  );
}

/* ======================================================
   FLOOR GLB
====================================================== */

function FloorGLB({ url, sizeM }: { url: string; sizeM: number }) {
  const { scene } = useGLTF(url);

  const { model, scaleK } = useMemo(() => {
    const cloned = scene.clone(true) as Group;
    const box = new Box3().setFromObject(cloned);
    const size = new Vector3();
    box.getSize(size);

    const maxSide = Math.max(size.x, size.z, 0.0001);
    const k = sizeM / maxSide;

    return { model: cloned, scaleK: k };
  }, [scene, sizeM]);

  return (
    <primitive
      object={model}
      scale={[scaleK, scaleK, scaleK]}
      position={[0, 0, 0]}
      receiveShadow
    />
  );
}

/* ======================================================
   FENCE
====================================================== */

type FencePost = { x: number; z: number; rotY: number };

function buildFencePerimeter(widthM: number, heightM: number, stepM = 2): FencePost[] {
  const w = Math.max(1, Math.round(widthM));
  const h = Math.max(1, Math.round(heightM));

  const hx = w / 2;
  const hz = h / 2;

  const posts: FencePost[] = [];

  const xCount = Math.ceil(w / stepM);
  const zCount = Math.ceil(h / stepM);

  for (let i = 0; i < xCount; i++) {
    const x = -hx + stepM / 2 + i * stepM;
    posts.push({ x, z: -hz, rotY: 0 });
    posts.push({ x, z: +hz, rotY: 0 });
  }

  for (let i = 0; i < zCount; i++) {
    const z = -hz + stepM / 2 + i * stepM;
    posts.push({ x: -hx, z, rotY: Math.PI / 2 });
    posts.push({ x: +hx, z, rotY: Math.PI / 2 });
  }

  return posts;
}

function pickFirstMesh(root: THREE.Object3D): Mesh | null {
  let found: Mesh | null = null;
  root.traverse((obj) => {
    if (!found && (obj as any).isMesh) found = obj as Mesh;
  });
  return found;
}

function FenceInstances({
  widthM,
  heightM,
  glbUrl,
  segmentLenM = 2,
  segmentHeightM = 1,
}: {
  widthM: number;
  heightM: number;
  glbUrl: string;
  segmentLenM?: number;
  segmentHeightM?: number;
}) {
  const ref = useRef<InstancedMesh>(null);
  const { scene } = useGLTF(glbUrl);

  const mesh = useMemo(() => pickFirstMesh(scene), [scene]);
  const geometry = mesh?.geometry as BufferGeometry | undefined;
  const material = mesh?.material as Material | Material[] | undefined;

  const yOffset = useMemo(() => {
    if (!geometry) return 0;
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    if (!bb) return 0;
    return -bb.min.y;
  }, [geometry]);

  const posts = useMemo(
    () => buildFencePerimeter(widthM, heightM, segmentLenM),
    [widthM, heightM, segmentLenM]
  );

  useEffect(() => {
    if (!ref.current) return;
    const m = new Matrix4();

    posts.forEach((p, i) => {
      m.identity();
      m.makeRotationY(p.rotY);
      m.setPosition(p.x, yOffset, p.z);
      ref.current!.setMatrixAt(i, m);
    });

    ref.current.instanceMatrix.needsUpdate = true;
  }, [posts, segmentHeightM, yOffset]);

  if (!geometry || !material) return null;

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material as any, posts.length]}
      castShadow
      receiveShadow
    />
  );
}

/* ======================================================
   SCENE
====================================================== */

function SceneStub({ season, state }: { season: SeasonKey; state: PlotState }) {
  const WORLD = 130;

  const sceneObjects = selectSceneObjects(state);

  const seasonCfg = getSeasonConfig(season);

  const base = import.meta.env.BASE_URL;
  const hdriUrl = `${base}hdri/openworld2k.hdr`;
  const fenceGlbUrl = `${base}assets/glb/terrain/fence/fence_2m.glb`;

  return (
    <>
      {/* HDRI оставляем как фон/небо. Основной “направленный” свет делаем солнцем */}
      <Environment files={hdriUrl} background blur={0} />

      {/* подложка, чтобы тени не были черными (но не убиваем контраст) */}
      <ambientLight intensity={0.08} />

      {/* лёгкий “небесный” свет */}
      <hemisphereLight intensity={0.18} />

      {/* ☀️ СОЛНЦЕ */}
      <SunLight x={120} y={160} z={-100} intensity={3.0} />

      <FloorGLB url={seasonCfg.floorGlbUrl} sizeM={WORLD} />

      <FenceInstances widthM={state.plotWidth} heightM={state.plotLength} glbUrl={fenceGlbUrl} />

      <SceneObjects3D objects={sceneObjects} plotWidth={state.plotWidth} plotLength={state.plotLength} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.6}
        zoomSpeed={0.7}
        enablePan={false}
        touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }}
        minPolarAngle={Math.PI / 4.6}
        maxPolarAngle={Math.PI / 2.15}
        enableZoom
        minDistance={15}
        maxDistance={170}
      />
    </>
  );
}

/* ======================================================
   VIEW
====================================================== */

export default function View3DScreen({ onBack }: { onBack: () => void }) {
  const [state] = useState<PlotState>(() => loadFromStorage() ?? getInitialState());

  const showSummaryPanel = state.currentScreen === 'summary';

  const [season, setSeason] = useState<SeasonKey>(() => getSeasonByScreen(state.currentScreen));

  useEffect(() => {
    setSeason(getSeasonByScreen(state.currentScreen));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentScreen]);

  const isAutumn = season === 'autumn';

  const handleHarvest = () => {
    if (!isAutumn) return;
    alert('Сбор урожая — заглушка. Логику добавим позже.');
  };

  const handleSeasonToggle = () => {
    setSeason((s) => nextSeason(s));
  };

  return (
    <div className="view3d-screen">
      {/* DOM-лоадер поверх всего */}
      <View3DLoader />

      <Canvas
        className="view3d-canvas"
        shadows
        camera={{ fov: 55, position: [100, 75, 110], near: 0.1, far: 2000 }}
        gl={{
          antialias: true,
          outputColorSpace: THREE.SRGBColorSpace,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <Suspense fallback={null}>
          <SceneStub season={season} state={state} />
        </Suspense>
      </Canvas>

      {showSummaryPanel && (
        <div className="view3d-panel" role="region" aria-label="Управление 3D режимом">
          <div className="view3d-panel-row">
            <div className="view3d-chip">
              <img
                className="view3d-chip-ico-img"
                src={SEASON_ICON_SRC[season]}
                alt=""
                aria-hidden="true"
              />
              <span className="view3d-chip-text">{SEASON_LABEL[season]}</span>
            </div>

            <button
              className="view3d-action"
              type="button"
              onClick={handleHarvest}
              disabled={!isAutumn}
              title={isAutumn ? 'Активно осенью' : 'Доступно только осенью'}
            >
              <img
                className="view3d-action-ico"
                src="assets/icons/carrot.svg"
                alt=""
                aria-hidden="true"
              />
              Сбор урожая
            </button>

            <button
              className="view3d-action"
              type="button"
              onClick={handleSeasonToggle}
              title="Переключить сезон"
            >
              Смена сезона
            </button>
          </div>
        </div>
      )}

      <button className="view3d-back" onClick={onBack}>
        Назад
      </button>
    </div>
  );
}

/* ======================================================
   PRELOAD
====================================================== */

const base = import.meta.env.BASE_URL;

useGLTF.preload(`${base}assets/glb/terrain/fence/fence_2m.glb`);
useGLTF.preload(`${base}assets/glb/terrain/floor/winter_floor.glb`);
useGLTF.preload(`${base}assets/glb/terrain/floor/spring_floor.glb`);
useGLTF.preload(`${base}assets/glb/terrain/floor/summer_floor.glb`);
useGLTF.preload(`${base}assets/glb/terrain/floor/autumn_floor.glb`);
