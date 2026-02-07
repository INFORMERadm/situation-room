import { useRef, useEffect, useCallback } from 'react';
import type { MapMarker } from '../types';
import { WORLD_COORDS } from '../lib/mapData';

interface Props {
  markers: MapMarker[];
}

function projectMercator(
  lat: number,
  lon: number,
  w: number,
  h: number,
): [number, number] {
  const x = ((lon + 180) / 360) * w;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = h / 2 - (w * mercN) / (2 * Math.PI);
  return [x, y];
}

export default function WorldMap({ markers }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * window.devicePixelRatio;
    canvas.height = h * window.devicePixelRatio;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#1a3a4a';
    for (const [lat, lon] of WORLD_COORDS) {
      const [x, y] = projectMercator(lat, lon, w, h);
      if (x >= 0 && x <= w && y >= 0 && y <= h) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    const MARKER_COLORS: Record<string, string> = {
      flight: '#00e5ff',
      shipping: '#58a6ff',
      event: '#ff4757',
    };

    for (const m of markers) {
      const [x, y] = projectMercator(m.lat, m.lon, w, h);
      if (x < 0 || x > w || y < 0 || y > h) continue;

      const color = MARKER_COLORS[m.type] || '#ff4757';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `${color}44`;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [markers]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  return (
    <div
      ref={containerRef}
      style={{
        border: '1px solid #1a3a4a',
        background: '#0d1117',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 8,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: '#c9d1d9',
          zIndex: 1,
        }}
      >
        GLOBAL VIEW
      </div>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
