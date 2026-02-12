import { useState } from 'react';
import Header from '../components/Header';
import TickerStrip from '../components/markets/TickerStrip';
import MarketSearch from '../components/markets/MarketSearch';
import CompanyProfile from '../components/markets/CompanyProfile';
import PriceChart from '../components/markets/PriceChart';
import MarketMovers from '../components/markets/MarketMovers';
import SectorPerformance from '../components/markets/SectorPerformance';
import MarketNews from '../components/markets/MarketNews';
import EarningsCalendar from '../components/markets/EarningsCalendar';
import EconomicCalendar from '../components/markets/EconomicCalendar';
import { useMarketsDashboard } from '../hooks/useMarketsDashboard';

const pageStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateRows: 'auto auto 1fr',
  height: '100vh',
  background: '#121212',
  overflow: 'hidden',
  gap: 0,
};

const mainStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '300px 1fr 320px',
  gap: 0,
  minHeight: 0,
  overflow: 'hidden',
};

const sidebarStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid #292929',
  minHeight: 0,
  overflow: 'hidden',
};

const centerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateRows: 'auto 1fr',
  minHeight: 0,
  overflow: 'hidden',
};

const rightStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateRows: '1fr 1.5fr',
  borderLeft: '1px solid #292929',
  minHeight: 0,
  overflow: 'hidden',
};

const toggleBarStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #292929',
  background: '#0a0a0a',
};

const toggleButtonStyle = (isActive: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '8px 12px',
  background: isActive ? '#1a1a1a' : 'transparent',
  color: isActive ? '#ffffff' : '#888888',
  border: 'none',
  borderBottom: isActive ? '2px solid #ff9800' : '2px solid transparent',
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
});

const panelDivider: React.CSSProperties = {
  borderBottom: '1px solid #292929',
};

export default function MarketsDashboard() {
  const data = useMarketsDashboard();
  const [rightPanelView, setRightPanelView] = useState<'news' | 'economic'>('news');

  return (
    <div style={pageStyle}>
      <Header />
      <TickerStrip items={data.overview} onSelect={data.selectSymbol} />

      <div style={mainStyle}>
        <div style={sidebarStyle}>
          <MarketSearch onSelect={data.selectSymbol} currentSymbol={data.selectedSymbol} />
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <MarketMovers
              gainers={data.movers.gainers}
              losers={data.movers.losers}
              active={data.movers.active}
              onSelect={data.selectSymbol}
            />
          </div>
        </div>

        <div style={centerStyle}>
          <div style={panelDivider}>
            <CompanyProfile
              profile={data.profile}
              quote={data.quote}
              loading={!!data.loading['profile']}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateRows: '1fr auto', minHeight: 0 }}>
            <PriceChart
              data={data.chart}
              symbol={data.selectedSymbol}
              timeframe={data.chartTimeframe}
              onTimeframeChange={data.setChartTimeframe}
              loading={!!data.loading['chart']}
            />
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              borderTop: '1px solid #292929',
              minHeight: 0,
            }}>
              <SectorPerformance sectors={data.sectors} />
            </div>
          </div>
        </div>

        <div style={rightStyle}>
          <div style={panelDivider}>
            <EarningsCalendar earnings={data.earnings} onSelect={data.selectSymbol} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div style={toggleBarStyle}>
              <button
                style={toggleButtonStyle(rightPanelView === 'news')}
                onClick={() => setRightPanelView('news')}
              >
                Market News
              </button>
              <button
                style={toggleButtonStyle(rightPanelView === 'economic')}
                onClick={() => setRightPanelView('economic')}
              >
                Economic Calendar
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {rightPanelView === 'news' ? (
                <MarketNews news={data.news} onSelectSymbol={data.selectSymbol} />
              ) : (
                <EconomicCalendar events={data.economic} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
