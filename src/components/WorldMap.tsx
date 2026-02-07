import { useRef, useEffect, useCallback } from 'react';
import type { MapMarker } from '../types';
import { COASTLINES } from '../lib/mapData';

interface Props {
  markers: MapMarker[];
}

const CELL = 4;
const GAP = 1;
const STEP = CELL + GAP;

function latLonToGrid(
  lat: number,
  lon: number,
  cols: number,
  rows: number,
): [number, number] {
  const col = Math.round(((lon + 180) / 360) * (cols - 1));
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const row = Math.round((rows - 1) / 2 - ((cols - 1) * mercN) / (2 * Math.PI));
  return [col, row];
}

function bresenham(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  grid: Uint8Array,
  cols: number,
  rows: number,
) {
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0;
  let cy = y0;

  for (;;) {
    if (cx >= 0 && cx < cols && cy >= 0 && cy < rows) {
      grid[cy * cols + cx] = 1;
    }
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
    if (dx === 0 && dy === 0) break;
  }
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

    const cols = Math.floor(w / STEP);
    const rows = Math.floor(h / STEP);

    ctx.fillStyle = '#080c12';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#2a2d32';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillRect(c * STEP, r * STEP, CELL, CELL);
      }
    }

    const grid = new Uint8Array(cols * rows);

    for (const segment of COASTLINES) {
      for (let i = 0; i < segment.length - 1; i++) {
        const [lat0, lon0] = segment[i];
        const [lat1, lon1] = segment[i + 1];
        if (Math.abs(lon1 - lon0) > 90) continue;
        const [c0, r0] = latLonToGrid(lat0, lon0, cols, rows);
        const [c1, r1] = latLonToGrid(lat1, lon1, cols, rows);
        bresenham(c0, r0, c1, r1, grid, cols, rows);
      }
      for (const [lat, lon] of segment) {
        const [c, r] = latLonToGrid(lat, lon, cols, rows);
        if (c >= 0 && c < cols && r >= 0 && r < rows) {
          grid[r * cols + c] = 1;
        }
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!grid[r * cols + c]) continue;
        const neighbors = [
          r > 0 && grid[(r - 1) * cols + c],
          r < rows - 1 && grid[(r + 1) * cols + c],
          c > 0 && grid[r * cols + (c - 1)],
          c < cols - 1 && grid[r * cols + (c + 1)],
        ].filter(Boolean).length;
        ctx.fillStyle = neighbors >= 2 ? '#1a6a7a' : '#155565';
        ctx.fillRect(c * STEP, r * STEP, CELL, CELL);
      }
    }

    const MARKER_COLORS: Record<string, string> = {
      flight: '#00e5ff',
      shipping: '#58a6ff',
      event: '#ff4757',
    };

    const now = Date.now();
    for (const m of markers) {
      const [mc, mr] = latLonToGrid(m.lat, m.lon, cols, rows);
      if (mc < 0 || mc >= cols || mr < 0 || mr >= rows) continue;

      const color = MARKER_COLORS[m.type] || '#ff4757';
      const px = mc * STEP;
      const py = mr * STEP;

      const pulse = 0.3 + 0.7 * Math.abs(Math.sin(now / 800 + mc));
      ctx.globalAlpha = pulse * 0.25;
      ctx.fillStyle = color;
      ctx.fillRect(px - STEP * 2, py - STEP * 2, CELL + STEP * 4, CELL + STEP * 4);
      ctx.globalAlpha = 0.5;
      ctx.fillRect(px - STEP, py - STEP, CELL + STEP * 2, CELL + STEP * 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.fillRect(px, py, CELL, CELL);

      if (m.label) {
        ctx.fillStyle = color;
        ctx.font = '9px JetBrains Mono, monospace';
        ctx.fillText(m.label, px + STEP + 4, py + CELL);
      }
    }
  }, [markers]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    const anim = setInterval(draw, 2000);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(anim);
    };
  }, [draw]);

  return (
    <div
      ref={containerRef}
      style={{
        border: '1px solid #1a3a4a',
        background: '#080c12',
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        paddingTop: 24,
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
