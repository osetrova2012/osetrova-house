import { useEffect, useRef } from 'react';
import { GRID_CELL_SIZE_M, GRID_MAX_ZOOM, GRID_MIN_ZOOM } from '../../utils/constants';
import './Grid.css';
import { intersectsAny } from '../../utils/collisions'; // <-- проверь имя файла/пути

type Point = { x: number; y: number };

export type GridObject =
  | {
      id: string;
      kind: 'rect';
      x: number; // центр в метрах
      y: number; // центр в метрах
      w: number; // ширина в метрах
      h: number;
      rotation?: number; // высота в метрах
      label?: string;
      fill?: string;
      stroke?: string;
    }
  | {
      id: string;
      kind: 'circle';
      x: number;
      y: number;
      r: number;
      label?: string;
      fill?: string;
      stroke?: string;
    };

interface GridProps {
  plotWidthM: number;
  plotLengthM: number;
  cellSizeM?: number;

  // опционально: уведомление, что ход заблокирован
  onBlockedMove?: (reason: string) => void;

  // клик/тап по сетке — отдаём "сырые" world-координаты
  onTapCell?: (pos: { xM: number; yM: number }) => void;

  // объекты поверх сетки
  objects?: GridObject[];

  // при перемещении объекта
  onMoveObject?: (id: string, nextPos: { x: number; y: number }) => void;

  className?: string;

  // === Terrain декорации (красная линия + подписи соседей) ===
  showTerrainDecor?: boolean;
  redLineOffsetM?: number; // по ТЗ: 2м
  redLineLabel?: string; // строго "Красная линия улицы"
  neighborLabel?: string; // "Соседний участок"
}

export default function Grid({
  plotWidthM,
  plotLengthM,
  cellSizeM = GRID_CELL_SIZE_M,
  onBlockedMove,
  onTapCell,
  objects = [],
  onMoveObject,
  className,

  showTerrainDecor = false,
  redLineOffsetM = 2,
  redLineLabel = 'Красная линия улицы',
  neighborLabel = 'Соседний участок',
}: GridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // камера (центр) в метрах и зум
  const camRef = useRef<Point>({ x: plotWidthM / 2, y: plotLengthM / 2 });
  const zoomRef = useRef<number>(1.0);
  const basePpmRef = useRef<number>(30);

  // актуальные размеры участка/ячейки в рефах
  const plotRef = useRef({ w: plotWidthM, h: plotLengthM });
  const prevPlotSizeRef = useRef({ w: plotWidthM, h: plotLengthM });

  const cellRef = useRef(cellSizeM);
  const objectsRef = useRef<GridObject[]>(objects);

  useEffect(() => {
    cellRef.current = cellSizeM;
    requestDraw(); // ✅ перерисовать, когда меняется размер клетки
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellSizeM]);

  useEffect(() => {
    objectsRef.current = objects;
    requestDraw(); // ✅ перерисовать, когда меняются объекты
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objects]);

  useEffect(() => {
    requestDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDragging = useRef(false);
  const dragMode = useRef<'none' | 'pan' | 'object'>('none');
  const draggedIdRef = useRef<string | null>(null);

  const lastMousePos = useRef<Point>({ x: 0, y: 0 });
  const movedRef = useRef(false);

  const requestDraw = () => {
    requestAnimationFrame(draw);
  };

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const snap = (v: number, step: number) => Math.round(v / step) * step;

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    const needResize =
      canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr);

    if (needResize) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const ppm = basePpmRef.current * zoomRef.current;
    const cam = camRef.current;
    const cell = cellRef.current;

    const toScreen = (worldX: number, worldY: number) => ({
      x: (worldX - cam.x) * ppm + w / 2,
      y: (worldY - cam.y) * ppm + h / 2,
    });

    const screenToWorld = (screenX: number, screenY: number) => ({
      x: (screenX - w / 2) / ppm + cam.x,
      y: (screenY - h / 2) / ppm + cam.y,
    });

    const minW = screenToWorld(0, 0);
    const maxW = screenToWorld(w, h);

    // фон
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, w, h);

    // сетка
    ctx.beginPath();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    for (let x = Math.floor(minW.x / cell) * cell; x <= maxW.x; x += cell) {
      const s = toScreen(x, 0);
      ctx.moveTo(s.x, 0);
      ctx.lineTo(s.x, h);
    }
    for (let y = Math.floor(minW.y / cell) * cell; y <= maxW.y; y += cell) {
      const s = toScreen(0, y);
      ctx.moveTo(0, s.y);
      ctx.lineTo(w, s.y);
    }
    ctx.stroke();

    // граница участка + заливка
    const pw = plotRef.current.w;
    const ph = plotRef.current.h;

    const tl = toScreen(0, 0);
    const br = toScreen(pw, ph);

    ctx.fillStyle = 'rgba(34, 197, 94, 0.05)';
    ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);

    // ===== Terrain декорации (красная линия + подписи соседей) =====
    if (showTerrainDecor) {
      // Отступ (в метрах) для подписей снаружи
      const padM = 1.2;

      // Текст с подложкой, с опциональным поворотом
      const drawText = (text: string, xM: number, yM: number, rotateRad = 0) => {
        const p = toScreen(xM, yM);
        ctx.save();
        ctx.translate(p.x, p.y);
        if (rotateRad !== 0) ctx.rotate(rotateRad);

        ctx.font = '500 14px system-ui, -apple-system, Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // подложка
        const metrics = ctx.measureText(text);
        const boxW = metrics.width + 14;
        const boxH = 26;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
        ctx.strokeStyle = 'rgba(17, 24, 39, 0.12)';
        ctx.lineWidth = 1;

        const r = 10;
        ctx.beginPath();
        ctx.moveTo(-boxW / 2 + r, -boxH / 2);
        ctx.arcTo(boxW / 2, -boxH / 2, boxW / 2, boxH / 2, r);
        ctx.arcTo(boxW / 2, boxH / 2, -boxW / 2, boxH / 2, r);
        ctx.arcTo(-boxW / 2, boxH / 2, -boxW / 2, -boxH / 2, r);
        ctx.arcTo(-boxW / 2, -boxH / 2, boxW / 2, -boxH / 2, r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // текст
        ctx.fillStyle = 'rgba(17, 24, 39, 0.78)';
        ctx.fillText(text, 0, 1);

        ctx.restore();
      };

      // --- Красная линия улицы: на 2м ниже нижней границы участка ---
      const yLineM = ph + redLineOffsetM;
      const a = toScreen(0, yLineM);
      const b = toScreen(pw, yLineM);

      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.95)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();

      // подпись строго под линией
      drawText(redLineLabel, pw / 2, yLineM + 0.8, 0);

      // --- Соседние участки: слева/справа/сверху ---
      drawText(neighborLabel, -padM, ph / 2, -Math.PI / 2);
      drawText(neighborLabel, pw + padM, ph / 2, Math.PI / 2);
      drawText(neighborLabel, pw / 2, -padM, 0);
    }

    // объекты
    const objs = objectsRef.current;
    for (const obj of objs) {
      const fill = obj.fill ?? 'rgba(59, 130, 246, 0.12)';
      const stroke = obj.stroke ?? 'rgba(59, 130, 246, 0.9)';

      if (obj.kind === 'rect') {
        const x0 = obj.x - obj.w / 2;
        const y0 = obj.y - obj.h / 2;
        const p0 = toScreen(x0, y0);
        const p1 = toScreen(x0 + obj.w, y0 + obj.h);

        const rw = p1.x - p0.x;
        const rh = p1.y - p0.y;

        ctx.fillStyle = fill;
        ctx.fillRect(p0.x, p0.y, rw, rh);

        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.strokeRect(p0.x, p0.y, rw, rh);

        if (obj.label) {
          const c = toScreen(obj.x, obj.y);
          ctx.fillStyle = 'rgba(17,24,39,0.85)';
          ctx.font = '700 12px system-ui, -apple-system, Segoe UI, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(obj.label, c.x, c.y);
        }
      } else {
        const c = toScreen(obj.x, obj.y);
        const rPx = obj.r * ppm;

        ctx.beginPath();
        ctx.arc(c.x, c.y, rPx, 0, Math.PI * 2);
        ctx.closePath();

        ctx.fillStyle = fill;
        ctx.fill();

        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (obj.label) {
          ctx.fillStyle = 'rgba(17,24,39,0.85)';
          ctx.font = '700 12px system-ui, -apple-system, Segoe UI, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(obj.label, c.x, c.y);
        }
      }
    }
  }

  // wheel zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const ppm = basePpmRef.current * zoomRef.current;

      const worldBefore = {
        x: (mouseX - canvas.clientWidth / 2) / ppm + camRef.current.x,
        y: (mouseY - canvas.clientHeight / 2) / ppm + camRef.current.y,
      };

      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const nextZoom = Math.min(Math.max(zoomRef.current * delta, GRID_MIN_ZOOM), GRID_MAX_ZOOM);

      zoomRef.current = nextZoom;
      const nextPpm = basePpmRef.current * nextZoom;

      camRef.current = {
        x: worldBefore.x - (mouseX - canvas.clientWidth / 2) / nextPpm,
        y: worldBefore.y - (mouseY - canvas.clientHeight / 2) / nextPpm,
      };

      requestDraw();
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // pinch zoom (2 fingers) for mobile
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // активный pinch
    let pinching = false;
    let startDist = 0;
    let startZoom = 1;
    let startCenterWorld = { x: 0, y: 0 };

    const getDist = (t1: Touch, t2: Touch) => {
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getCenter = (t1: Touch, t2: Touch) => ({
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2,
    });

    const screenToWorldFromClient = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;

      const ppm = basePpmRef.current * zoomRef.current;
      return {
        x: (sx - canvas.clientWidth / 2) / ppm + camRef.current.x,
        y: (sy - canvas.clientHeight / 2) / ppm + camRef.current.y,
      };
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;

      // ВАЖНО: блокируем стандартный zoom страницы
      e.preventDefault();

      pinching = true;
      isDragging.current = false; // чтобы не мешало пану/драггу
      dragMode.current = 'none';
      draggedIdRef.current = null;

      const [t1, t2] = [e.touches[0], e.touches[1]];

      startDist = getDist(t1, t2);
      startZoom = zoomRef.current;

      const c = getCenter(t1, t2);
      startCenterWorld = screenToWorldFromClient(c.x, c.y);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pinching) return;
      if (e.touches.length !== 2) return;

      e.preventDefault();

      const [t1, t2] = [e.touches[0], e.touches[1]];
      const dist = getDist(t1, t2);
      if (startDist <= 0) return;

      // коэффициент масштабирования
      const scale = dist / startDist;
      const nextZoom = clamp(startZoom * scale, GRID_MIN_ZOOM, GRID_MAX_ZOOM);

      // хотим масштабировать относительно центра pinch
      zoomRef.current = nextZoom;

      const c = getCenter(t1, t2);
      const rect = canvas.getBoundingClientRect();
      const sx = c.x - rect.left;
      const sy = c.y - rect.top;

      const nextPpm = basePpmRef.current * nextZoom;

      camRef.current = {
        x: startCenterWorld.x - (sx - canvas.clientWidth / 2) / nextPpm,
        y: startCenterWorld.y - (sy - canvas.clientHeight / 2) / nextPpm,
      };

      requestDraw();
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinching = false;
      }
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function hitTest(world: Point): GridObject | null {
    const objs = objectsRef.current;
    for (let i = objs.length - 1; i >= 0; i--) {
      const obj = objs[i];
      if (obj.kind === 'rect') {
        if (Math.abs(world.x - obj.x) <= obj.w / 2 && Math.abs(world.y - obj.y) <= obj.h / 2) {
          return obj;
        }
      } else {
        const dx = world.x - obj.x;
        const dy = world.y - obj.y;
        if (Math.sqrt(dx * dx + dy * dy) <= obj.r) return obj;
      }
    }
    return null;
  }

  function screenToWorldFromEvent(e: React.PointerEvent) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const ppm = basePpmRef.current * zoomRef.current;
    return {
      x: (sx - canvas.clientWidth / 2) / ppm + camRef.current.x,
      y: (sy - canvas.clientHeight / 2) / ppm + camRef.current.y,
    };
  }

  // pointer events
  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    isDragging.current = true;
    movedRef.current = false;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId);

    const world = screenToWorldFromEvent(e);
    const hit = hitTest(world);

    if (hit && onMoveObject) {
      dragMode.current = 'object';
      draggedIdRef.current = hit.id;
    } else {
      dragMode.current = 'pan';
      draggedIdRef.current = null;
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;

    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;

    if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true;

    if (dragMode.current === 'pan') {
      const ppm = basePpmRef.current * zoomRef.current;
      camRef.current.x -= dx / ppm;
      camRef.current.y -= dy / ppm;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      requestDraw();
      return;
    }

    if (dragMode.current === 'object' && onMoveObject && draggedIdRef.current) {
      const id = draggedIdRef.current;
      const world = screenToWorldFromEvent(e);

      const cell = cellRef.current;

      const obj = objectsRef.current.find((o) => o.id === id);
      if (!obj) return;

      const pw = plotRef.current.w;
      const ph = plotRef.current.h;

      let x = world.x;
      let y = world.y;

      if (obj.kind === 'rect') {
        const halfW = obj.w / 2;
        const halfH = obj.h / 2;

        x = snap(world.x - halfW, cell) + halfW;
        y = snap(world.y - halfH, cell) + halfH;

        x = clamp(x, halfW, pw - halfW);
        y = clamp(y, halfH, ph - halfH);
      } else {
        x = snap(world.x, cell);
        y = snap(world.y, cell);

        x = clamp(x, obj.r, pw - obj.r);
        y = clamp(y, obj.r, ph - obj.r);
      }

      const candidate: GridObject = { ...obj, x, y } as GridObject;
      const blocked = intersectsAny(candidate, objectsRef.current, id, 0);

      if (blocked) {
        onBlockedMove?.('Нельзя разместить объект поверх другого');
        requestDraw();
        return;
      }

      onMoveObject(id, { x, y });
      requestDraw();
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const wasDrag = movedRef.current;
    const mode = dragMode.current;

    isDragging.current = false;
    dragMode.current = 'none';
    draggedIdRef.current = null;

    if (!wasDrag && mode !== 'object' && onTapCell) {
      const world = screenToWorldFromEvent(e);
      onTapCell({ xM: world.x, yM: world.y });
    }
  };

  // fit + resize
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();

      const { w: pw, h: ph } = plotRef.current;
      basePpmRef.current = Math.min(width / pw, height / ph) * 0.8;

      requestDraw();
    };

    updateSize();
    window.visualViewport?.addEventListener('resize', updateSize);
    return () => window.visualViewport?.removeEventListener('resize', updateSize);
  }, []);

  // пересчёт при изменении размеров участка
  useEffect(() => {
    if (!containerRef.current) return;

    const prev = prevPlotSizeRef.current;
    const dx = camRef.current.x - prev.w / 2;
    const dy = camRef.current.y - prev.h / 2;

    plotRef.current = { w: plotWidthM, h: plotLengthM };

    camRef.current = {
      x: plotWidthM / 2 + dx,
      y: plotLengthM / 2 + dy,
    };

    const { width, height } = containerRef.current.getBoundingClientRect();
    basePpmRef.current = Math.min(width / plotWidthM, height / plotLengthM) * 0.8;

    prevPlotSizeRef.current = { w: plotWidthM, h: plotLengthM };

    requestDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotWidthM, plotLengthM]);

  return (
    <div ref={containerRef} className={`grid-container ${className || ''}`}>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => {
          zoomRef.current = 1;
          camRef.current = { x: plotRef.current.w / 2, y: plotRef.current.h / 2 };
          requestDraw();
        }}
        style={{ touchAction: 'none', display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  );
}
