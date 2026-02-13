import Header from '../components/Header';
import TickerStrip from '../components/markets/TickerStrip';
import MarketSearch from '../components/markets/MarketSearch';
import CompanyProfile from '../components/markets/CompanyProfile';
import PriceChart from '../components/markets/PriceChart';
import MarketMovers from '../components/markets/MarketMovers';
import MarketNews from '../components/markets/MarketNews';
import EarningsCalendar from '../components/markets/EarningsCalendar';
import EconomicCalendar from '../components/markets/EconomicCalendar';
import AIChatBox from '../components/markets/AIChatBox';
import ModeSidebar from '../components/ModeSidebar';
import { useMarketsDashboard } from '../hooks/useMarketsDashboard';
import { useAIChat } from '../hooks/useAIChat';
import { usePlatform } from '../context/PlatformContext';

const pageStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateRows: 'auto auto 1fr',
  height: '100vh',
  background: '#000000',
  overflow: 'hidden',
  gap: 0,
};

const mainStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '300px 1fr 320px 48px',
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
  background: '#000000',
};

const rightStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateRows: '1fr 1.5fr',
  borderLeft: '1px solid #292929',
  minHeight: 0,
  overflow: 'hidden',
  background: '#090909',
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
  color: isActive ? '#ffffff' : '#aaaaaa',
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
  const platform = usePlatform();
  const ai = useAIChat(data.selectSymbol, data.setChartTimeframe);

  const handleToggleIndicator = (id: string) => {
    platform.toggleIndicator(id);
  };

  return (
    <div style={pageStyle}>
      <Header
        externalClocks={platform.clocks}
        onAddClock={platform.addClock}
        onRemoveClock={platform.removeClock}
      />
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
              externalTab={platform.leftTab}
              onTabChange={platform.setLeftTab}
              externalWatchlist={platform.watchlist}
              onAddInstrument={platform.addToWatchlist}
              onRemoveInstrument={platform.removeFromWatchlist}
            />
          </div>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'hidden',
        }}>
          {!ai.isExpanded && (
            <>
              <div style={panelDivider}>
                <CompanyProfile
                  profile={data.profile}
                  quote={data.quote}
                  loading={!!data.loading['profile']}
                />
              </div>
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <PriceChart
                  data={data.chart}
                  symbol={data.selectedSymbol}
                  timeframe={data.chartTimeframe}
                  onTimeframeChange={data.setChartTimeframe}
                  loading={!!data.loading['chart']}
                  externalChartType={platform.chartType}
                  onChartTypeChange={platform.setChartType}
                  externalIndicators={platform.indicators}
                  onToggleIndicator={handleToggleIndicator}
                />
              </div>
            </>
          )}
          <div style={{ flex: ai.isExpanded ? 1 : undefined, minHeight: ai.isExpanded ? 0 : undefined }}>
            <AIChatBox
              messages={ai.messages}
              isExpanded={ai.isExpanded}
              isStreaming={ai.isStreaming}
              streamingContent={ai.streamingContent}
              sessions={ai.sessions}
              inlineStatus={ai.inlineStatus}
              selectedModel={ai.selectedModel}
              searchMode={ai.searchMode}
              searchSources={ai.searchSources}
              searchImages={ai.searchImages}
              searchProgress={ai.searchProgress}
              isSourcesPanelOpen={ai.isSourcesPanelOpen}
              onSend={ai.sendMessage}
              onStop={ai.stopGenerating}
              onRegenerate={ai.regenerate}
              onToggleExpand={ai.toggleExpand}
              onCollapse={ai.collapse}
              onLoadSession={ai.loadSession}
              onNewSession={ai.newSession}
              onModelChange={ai.setModel}
              onShowChart={ai.collapse}
              onSetSearchMode={ai.setSearchMode}
              onToggleSourcesPanel={ai.toggleSourcesPanel}
              onRefreshSessions={ai.refreshSessions}
            />
          </div>
        </div>

        <div style={rightStyle}>
          <div style={panelDivider}>
            <EarningsCalendar earnings={data.earnings} onSelect={data.selectSymbol} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
            <div style={toggleBarStyle}>
              <button
                style={toggleButtonStyle(platform.rightPanelView === 'news')}
                onClick={() => platform.setRightPanelView('news')}
              >
                Market News
              </button>
              <button
                style={toggleButtonStyle(platform.rightPanelView === 'economic')}
                onClick={() => platform.setRightPanelView('economic')}
              >
                Economic Calendar
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              {platform.rightPanelView === 'news' ? (
                <MarketNews
                  news={data.news}
                  onSelectSymbol={data.selectSymbol}
                  onExplain={(headline) => {
                    ai.sendMessage(`Explain this news headline and its market impact: "${headline}"`);
                  }}
                />
              ) : (
                <EconomicCalendar events={data.economic} />
              )}
            </div>
          </div>
        </div>
        <ModeSidebar />
      </div>
    </div>
  );
}
