import { PlatformProvider } from './context/PlatformContext';
import MarketsDashboard from './pages/MarketsDashboard';

export default function App() {
  return (
    <PlatformProvider>
      <MarketsDashboard />
    </PlatformProvider>
  );
}
