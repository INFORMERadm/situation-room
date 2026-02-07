import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import SportsPanel from './components/SportsPanel';
import ForecastsPanel from './components/ForecastsPanel';
import AviationPanel from './components/AviationPanel';
import MarketsPanel from './components/MarketsPanel';
import NewsPanel from './components/NewsPanel';
import WorldMap from './components/WorldMap';
import PizzaIndex from './components/PizzaIndex';
import OfficialComms from './components/OfficialComms';
import { useDataFeed } from './hooks/useDataFeed';
import MarketsDashboard from './pages/MarketsDashboard';

const dashStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateRows: 'auto 1fr auto',
  height: '100vh',
  gap: 2,
  padding: 4,
};

const mainStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 3fr 1fr',
  gap: 2,
  minHeight: 0,
  overflow: 'hidden',
};

const colStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minHeight: 0,
  overflow: 'hidden',
};

const colChildStyle: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
};

const centerStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateRows: '7fr 3fr',
  gap: 2,
  minHeight: 0,
};

const centerBottomStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 2,
  minHeight: 0,
};

function GlobalMonitor() {
  const data = useDataFeed();

  return (
    <div style={dashStyle}>
      <Header />
      <div style={mainStyle}>
        <div style={colStyle}>
          <div style={colChildStyle}><SportsPanel data={data.sports} /></div>
          <div style={colChildStyle}><ForecastsPanel data={data.forecasts} /></div>
          <div style={colChildStyle}><AviationPanel data={data.flights} /></div>
        </div>
        <div style={centerStyle}>
          <WorldMap />
          <div style={centerBottomStyle}>
            <PizzaIndex data={data.pizza} />
            <OfficialComms messages={data.comms} />
          </div>
        </div>
        <div style={colStyle}>
          <div style={{ flex: 2, minHeight: 0 }}><MarketsPanel data={data.markets} /></div>
          <div style={{ flex: 1, minHeight: 0 }}><NewsPanel data={data.news} /></div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GlobalMonitor />} />
      <Route path="/markets" element={<MarketsDashboard />} />
    </Routes>
  );
}
