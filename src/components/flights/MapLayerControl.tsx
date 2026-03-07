import { useState } from 'react';
import type { MapLayerName } from '../../types';

interface LayerInfo {
  key: MapLayerName;
  label: string;
  count: number;
  color: string;
}

interface Props {
  layers: Record<MapLayerName, boolean>;
  onToggle: (layer: MapLayerName) => void;
  flightCount: number;
  baseCount: number;
  navalCount: number;
  vesselCount: number;
  shippingLoading?: boolean;
  shippingError?: string | null;
}

export default function MapLayerControl({ layers, onToggle, flightCount, baseCount, navalCount, vesselCount, shippingLoading, shippingError }: Props) {
  const [expanded, setExpanded] = useState(true);

  const layerInfos: LayerInfo[] = [
    { key: 'flights', label: 'Flights', count: flightCount, color: '#2196f3' },
    { key: 'military-bases', label: 'Military Bases', count: baseCount, color: '#4caf50' },
    { key: 'naval-assets', label: 'Naval Assets', count: navalCount, color: '#00bcd4' },
    { key: 'commercial-shipping', label: 'Shipping', count: vesselCount, color: '#ff9800' },
  ];

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.85)',
          border: '1px solid #333',
          borderRadius: 6,
          padding: '6px 8px',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        Layers
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 1000,
      background: 'rgba(0,0,0,0.88)',
      border: '1px solid #333',
      borderRadius: 8,
      padding: '8px 0',
      minWidth: 180,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px 6px',
        borderBottom: '1px solid #333',
        marginBottom: 4,
      }}>
        <span style={{ color: '#aaa', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
          Layers
        </span>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            padding: 2,
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      {layerInfos.map(info => (
        <button
          key={info.key}
          onClick={() => onToggle(info.key)}
          style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '5px 10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            gap: 8,
            textAlign: 'left',
          }}
        >
          <div style={{
            width: 14,
            height: 14,
            borderRadius: 3,
            border: `1.5px solid ${layers[info.key] ? info.color : '#555'}`,
            background: layers[info.key] ? info.color : 'transparent',
            opacity: layers[info.key] ? 1 : 0.4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}>
            {layers[info.key] && (
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#000" strokeWidth="2">
                <path d="M2 6l3 3 5-5" />
              </svg>
            )}
          </div>
          <span style={{
            color: layers[info.key] ? '#ddd' : '#666',
            fontSize: 11,
            flex: 1,
            transition: 'color 0.15s ease',
          }}>
            {info.label}
          </span>
          <span style={{
            color: info.key === 'commercial-shipping' && shippingError ? '#f44336' :
                   info.key === 'commercial-shipping' && shippingLoading ? '#ff9800' :
                   layers[info.key] ? '#888' : '#555',
            fontSize: 10,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {info.key === 'commercial-shipping' && shippingLoading ? 'connecting...' :
             info.key === 'commercial-shipping' && shippingError ? 'offline' :
             info.count > 0 ? info.count.toLocaleString() : '--'}
          </span>
        </button>
      ))}
    </div>
  );
}
