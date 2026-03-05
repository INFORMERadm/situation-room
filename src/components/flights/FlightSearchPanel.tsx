import { useState, useCallback } from 'react';
import type { FlightSearchMode, OpenSkyFlight, AircraftTrack } from '../../types';
import FlightSearchResults from './FlightSearchResults';

interface FlightSearchPanelProps {
  isOpen: boolean;
  mode: FlightSearchMode;
  loading: boolean;
  error: string | null;
  results: OpenSkyFlight[];
  activeTrack: AircraftTrack | null;
  onToggle: () => void;
  onSetMode: (mode: FlightSearchMode) => void;
  onClearResults: () => void;
  onClearTrack: () => void;
  onSearchInterval: (begin: number, end: number) => void;
  onSearchAircraft: (icao24: string, begin: number, end: number) => void;
  onSearchArrivals: (airport: string, begin: number, end: number) => void;
  onSearchDepartures: (airport: string, begin: number, end: number) => void;
  onSearchTrack: (icao24: string, time?: number) => void;
}

const TABS: { key: FlightSearchMode; label: string }[] = [
  { key: 'flights-aircraft', label: 'Aircraft' },
  { key: 'arrivals-airport', label: 'Arrivals' },
  { key: 'departures-airport', label: 'Departures' },
  { key: 'track-aircraft', label: 'Track' },
  { key: 'flights-interval', label: 'Interval' },
];

function toLocalDatetimeStr(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getDefaultEnd(): string {
  return toLocalDatetimeStr(new Date());
}

function getDefaultBegin(hoursAgo: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo);
  return toLocalDatetimeStr(d);
}

export default function FlightSearchPanel({
  isOpen,
  mode,
  loading,
  error,
  results,
  activeTrack,
  onToggle,
  onSetMode,
  onClearResults,
  onClearTrack,
  onSearchInterval,
  onSearchAircraft,
  onSearchArrivals,
  onSearchDepartures,
  onSearchTrack,
}: FlightSearchPanelProps) {
  const [icao24, setIcao24] = useState('');
  const [airport, setAirport] = useState('');
  const [beginStr, setBeginStr] = useState(() => getDefaultBegin(1));
  const [endStr, setEndStr] = useState(() => getDefaultEnd());
  const [trackLive, setTrackLive] = useState(true);

  const applyPreset = useCallback((hours: number) => {
    setEndStr(getDefaultEnd());
    setBeginStr(getDefaultBegin(hours));
  }, []);

  const handleSearch = useCallback(() => {
    const beginTs = Math.floor(new Date(beginStr).getTime() / 1000);
    const endTs = Math.floor(new Date(endStr).getTime() / 1000);

    switch (mode) {
      case 'flights-interval':
        onSearchInterval(beginTs, endTs);
        break;
      case 'flights-aircraft':
        onSearchAircraft(icao24, beginTs, endTs);
        break;
      case 'arrivals-airport':
        onSearchArrivals(airport, beginTs, endTs);
        break;
      case 'departures-airport':
        onSearchDepartures(airport, beginTs, endTs);
        break;
      case 'track-aircraft':
        onSearchTrack(icao24, trackLive ? 0 : Math.floor(new Date(beginStr).getTime() / 1000));
        break;
    }
  }, [mode, icao24, airport, beginStr, endStr, trackLive, onSearchInterval, onSearchAircraft, onSearchArrivals, onSearchDepartures, onSearchTrack]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          top: 56,
          left: 12,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.85)',
          border: '1px solid #333',
          borderRadius: 6,
          color: '#ccc',
          padding: '7px 12px',
          fontSize: 11,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
        Search
      </button>
    );
  }

  const needsIcao24 = mode === 'flights-aircraft' || mode === 'track-aircraft';
  const needsAirport = mode === 'arrivals-airport' || mode === 'departures-airport';
  const needsTimeRange = mode !== 'track-aircraft' || !trackLive;
  const isTrackMode = mode === 'track-aircraft';

  const maxHoursLabel = mode === 'flights-interval' ? '2h max' :
    (mode === 'flights-aircraft' ? '2d max' : '7d max');

  return (
    <div style={{
      position: 'absolute',
      top: 12,
      left: 12,
      zIndex: 1000,
      width: 310,
      background: 'rgba(13,13,13,0.96)',
      border: '1px solid #1a1a1a',
      borderRadius: 8,
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: 'calc(100% - 24px)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 12px 8px',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>Flight Search</span>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            fontSize: 16,
            cursor: 'pointer',
            padding: '0 2px',
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 0,
        borderBottom: '1px solid #1a1a1a',
        overflow: 'hidden',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => onSetMode(tab.key)}
            style={{
              flex: 1,
              background: mode === tab.key ? '#1a1a1a' : 'transparent',
              border: 'none',
              borderBottom: mode === tab.key ? '2px solid #ff9800' : '2px solid transparent',
              color: mode === tab.key ? '#ff9800' : '#666',
              fontSize: 10,
              fontWeight: 600,
              padding: '8px 4px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div style={{ padding: '10px 12px', flex: 1, overflowY: 'auto' }}>
        {needsIcao24 && (
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>ICAO24 Hex Address</label>
            <input
              type="text"
              value={icao24}
              onChange={e => setIcao24(e.target.value)}
              placeholder="e.g. 3c675a"
              maxLength={6}
              style={inputStyle}
            />
          </div>
        )}

        {needsAirport && (
          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Airport ICAO Code</label>
            <input
              type="text"
              value={airport}
              onChange={e => setAirport(e.target.value)}
              placeholder="e.g. EDDF, KJFK"
              maxLength={4}
              style={inputStyle}
            />
          </div>
        )}

        {isTrackMode && (
          <div style={{ marginBottom: 8 }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={trackLive}
                onChange={e => setTrackLive(e.target.checked)}
                style={{ accentColor: '#ff9800' }}
              />
              Live Track (current flight)
            </label>
          </div>
        )}

        {needsTimeRange && (
          <>
            <div style={{ marginBottom: 6 }}>
              <label style={labelStyle}>
                Start Time
                {!isTrackMode && <span style={{ color: '#555', marginLeft: 6 }}>({maxHoursLabel})</span>}
              </label>
              <input
                type="datetime-local"
                value={beginStr}
                onChange={e => setBeginStr(e.target.value)}
                style={inputStyle}
              />
            </div>
            {!isTrackMode && (
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>End Time</label>
                <input
                  type="datetime-local"
                  value={endStr}
                  onChange={e => setEndStr(e.target.value)}
                  style={inputStyle}
                />
              </div>
            )}

            {!isTrackMode && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
                {[
                  { label: '1h', hours: 1 },
                  { label: '6h', hours: 6 },
                  { label: '24h', hours: 24 },
                  { label: '2d', hours: 48 },
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p.hours)}
                    style={{
                      flex: 1,
                      background: '#111',
                      border: '1px solid #292929',
                      borderRadius: 4,
                      color: '#888',
                      fontSize: 10,
                      padding: '4px 0',
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? '#333' : '#ff9800',
            border: 'none',
            borderRadius: 5,
            color: loading ? '#888' : '#000',
            fontSize: 12,
            fontWeight: 700,
            padding: '9px 0',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>

        {error && (
          <div style={{
            marginTop: 8,
            padding: '6px 10px',
            background: 'rgba(244,67,54,0.1)',
            border: '1px solid rgba(244,67,54,0.3)',
            borderRadius: 4,
            color: '#f44336',
            fontSize: 10,
          }}>
            {error}
          </div>
        )}

        <FlightSearchResults
          results={results}
          activeTrack={activeTrack}
          onClear={onClearResults}
          onClearTrack={onClearTrack}
        />
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#777',
  fontSize: 10,
  fontWeight: 600,
  marginBottom: 4,
  letterSpacing: 0.3,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#111',
  border: '1px solid #292929',
  borderRadius: 4,
  color: '#ddd',
  fontSize: 12,
  padding: '7px 10px',
  outline: 'none',
  fontFamily: 'monospace',
  boxSizing: 'border-box',
};
