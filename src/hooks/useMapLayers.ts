import { useState, useCallback } from 'react';
import type { MapLayerName } from '../types';

const STORAGE_KEY = 'n4-map-layers';

type LayerState = Record<MapLayerName, boolean>;

const DEFAULT_LAYERS: LayerState = {
  'flights': true,
  'military-bases': true,
  'naval-assets': true,
  'strike-events': true,
  'critical-infrastructure': true,
};

function loadSavedLayers(): LayerState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_LAYERS, ...parsed };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_LAYERS };
}

export function useMapLayers() {
  const [layers, setLayers] = useState<LayerState>(loadSavedLayers);

  const toggleLayer = useCallback((layer: MapLayerName) => {
    setLayers(prev => {
      const next = { ...prev, [layer]: !prev[layer] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const isLayerVisible = useCallback((layer: MapLayerName) => layers[layer], [layers]);

  return { layers, toggleLayer, isLayerVisible };
}
