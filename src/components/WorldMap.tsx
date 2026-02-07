import { useRef, useEffect, useCallback } from 'react';
import type { MapMarker } from '../types';
import { COASTLINES, GRID_LINES } from '../lib/mapData';

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
    const dpr = window.devicePixelRatio;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#0f1a22';
    ctx.lineWidth = 0.5;
    for (const g of GRID_LINES) {
      if (g.lat !== undefined) {
        const [, y] = projectMercator(g.lat, 0, w, h);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = '#2a5a6a';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const segment of COASTLINES) {
      if (segment.length < 2) continue;
      ctx.beginPath();
      const [startY, startX] = segment[0];
      const [sx, sy] = projectMercator(startY, startX, w, h);
      ctx.moveTo(sx, sy);
      for (let i = 1; i < segment.length; i++) {
        const [lat, lon] = segment[i];
        const [px, py] = projectMercator(lat, lon, w, h);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    ctx.fillStyle = '#1a4a5a';
    for (const segment of COASTLINES) {
      for (const [lat, lon] of segment) {
        const [px, py] = projectMercator(lat, lon, w, h);
        if (px >= 0 && px <= w && py >= 0 && py <= h) {
          ctx.beginPath();
          ctx.arc(px, py, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const MARKER_COLORS: Record<string, string> = {
      flight: '#00e5ff',
      shipping: '#58a6ff',
      event: '#ff4757',
    };

    const now = Date.now();
    for (const m of markers) {
      const [x, y] = projectMercator(m.lat, m.lon, w, h);
      if (x < 0 || x > w || y < 0 || y > h) continue;

      const color = MARKER_COLORS[m.type] || '#ff4757';

      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(now / 1000 + x));
      ctx.fillStyle = color + Math.round(pulse * 30).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color + '66';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (m.label) {
        ctx.fillStyle = color;
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillText(m.label, x + 6, y + 3);
      }
    }
  }, [markers]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    const animFrame = setInterval(draw, 2000);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(animFrame);
    };
  }, [draw]);

  return (
    <div
      ref={containerRef}
      style={{
        border: '1px solid #1a3a4a',
        background: '#0a0e14',
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
          color: '#4a8a9a',
          zIndex: 1,
        }}
      >
        GLOBAL VIEW
      </div>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
}
