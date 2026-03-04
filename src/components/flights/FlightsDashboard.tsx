import { useState, useCallback } from 'react';
import FlightMap from './FlightMap';
import FlightDetailPanel from './FlightDetailPanel';
import FlightSearchBar from './FlightSearchBar';
import { useFlightsDashboard } from '../../hooks/useFlightsDashboard';

export default function FlightsDashboard() {
  const fd = useFlightsDashboard();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSelectFromSearch = useCallback((flightId: string) => {
    fd.selectFlight(flightId);
    setSearchOpen(false);
    fd.setSearchQuery('');
  }, [fd]);

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      minHeight: 0, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderBottom: '1px solid #292929',
        background: '#0a0a0a', flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#ff9800">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>
          LIVE FLIGHT RADAR
        </span>
        <div style={{ flex: 1 }} />

        <button
          onClick={() => setSearchOpen(!searchOpen)}
          style={{
            background: searchOpen ? '#1a1a1a' : 'transparent',
            border: '1px solid #333', borderRadius: 4,
            color: '#aaa', cursor: 'pointer', padding: '4px 10px',
            fontSize: 10, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Search
        </button>

        {fd.loading && (
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#4ade80', animation: 'pulse 1.5s infinite',
          }} />
        )}
      </div>

      {searchOpen && (
        <FlightSearchBar
          query={fd.searchQuery}
          onQueryChange={fd.setSearchQuery}
          results={fd.filteredFlights.slice(0, 20)}
          onSelect={handleSelectFromSearch}
          onClose={() => { setSearchOpen(false); fd.setSearchQuery(''); }}
        />
      )}

      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <FlightMap
          flights={fd.filteredFlights}
          selectedFlightId={fd.selectedFlightId}
          onBoundsChange={fd.setBounds}
          onSelectFlight={fd.selectFlight}
        />

        {fd.selectedFlight && (
          <FlightDetailPanel
            flight={fd.selectedFlight}
            loading={fd.detailLoading}
            onClose={fd.clearSelection}
          />
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
