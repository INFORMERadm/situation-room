import { useState, useEffect } from 'react';
import { useWarDashboard } from '../../hooks/useWarDashboard';
import {
  StrikesByCountryChart,
  InfraStatusChart,
  StrikeTimelineChart,
  NavalOrbatChart,
  ForceCompositionChart,
} from './WarDashboardCharts';

interface WarDashboardProps {
  onClose: () => void;
}

type Tab = 'overview' | 'theatres' | 'forces' | 'infrastructure';

const TAB_ITEMS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'OVERVIEW' },
  { key: 'theatres', label: 'THEATRES' },
  { key: 'forces', label: 'FORCE POSTURE' },
  { key: 'infrastructure', label: 'INFRASTRUCTURE' },
];

const THEATRE_DATA = [
  {
    id: 'gaza',
    name: 'Gaza Strip',
    period: 'Oct 2023 -- Present',
    belligerents: ['Israel (IDF)', 'Hamas', 'Palestinian Islamic Jihad'],
    stats: {
      totalTargetsStruck: 31000,
      totalStrikes: 22320,
      confirmedKilled: 75227,
      wounded: 120000,
      displaced: 1900000,
      infrastructureDestroyed: '87% of schools, 30 of 36 hospitals',
    },
    sources: 'IDF official data (Feb 2024: 31,000 targets in 4 months), ACLED (22,320 attacks Oct 2023-Oct 2024)',
    keyEvents: [
      { date: 'Oct 7, 2023', event: 'Hamas attacks Israel, 1,200 killed' },
      { date: 'Oct 27, 2023', event: 'IDF ground invasion begins' },
      { date: 'Feb 2024', event: 'IDF confirms 31,000 targets struck on all fronts (29,000 in Gaza)' },
      { date: 'Jan 2026', event: 'IDF accepts Gaza Health Ministry casualty figures' },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'lebanon',
    name: 'Lebanon',
    period: 'Oct 2023 -- Present',
    belligerents: ['Israel (IDF)', 'Hezbollah', 'Lebanese Armed Forces'],
    stats: {
      totalTargetsStruck: 12650,
      totalStrikes: 5700,
      confirmedKilled: 5547,
      wounded: 17638,
      displaced: 1000000,
      infrastructureDestroyed: 'Beirut southern suburbs, border towns',
    },
    sources: 'ACLED (12,650 attacks in 11 months of 2024), Lebanese Health Ministry',
    keyEvents: [
      { date: 'Sep 2024', event: 'Pager attacks on Hezbollah, massive airstrike campaign begins' },
      { date: 'Nov 2024', event: 'Ceasefire agreement, 5,700 strike events in 2 months' },
      { date: 'Apr 8, 2026', event: 'Strikes kill 254 in central Beirut in single day' },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'iran-12day',
    name: 'Iran -- Twelve-Day War',
    period: 'Jun 13--24, 2025',
    belligerents: ['Israel (IDF)', 'United States (limited)', 'Iran (IRGC, Air Force)'],
    stats: {
      totalTargetsStruck: 508,
      totalStrikes: 360,
      confirmedKilled: 1500,
      airDefensesDestroyed: 70,
      ballisticLaunchersDestroyed: 250,
      missilesDestroyed: 1000,
      nuclearScientistsEliminated: 15,
      seniorOfficersKilled: 20,
      provincesHit: 27,
    },
    sources: 'ACLED (508 air strikes), Al Jazeera Sanad (145 strikes), Times of Israel, Britannica',
    keyEvents: [
      { date: 'Jun 13', event: '200+ fighter jets strike 100+ nuclear & military facilities' },
      { date: 'Jun 22', event: 'US strikes Fordow, Natanz, Isfahan nuclear sites' },
      { date: 'Jun 24', event: 'Ceasefire under US pressure' },
    ],
    iranRetaliation: {
      ballisticMissiles: 550,
      drones: 1000,
      interceptionRate: 90,
      israeliCasualties: 28,
      israeliWounded: 3000,
    },
    status: 'CONCLUDED',
  },
  {
    id: 'iran-2026',
    name: 'Iran -- 2026 War',
    period: 'Feb 28, 2026 -- Present',
    belligerents: ['Israel (IDF)', 'United States', 'Iran'],
    stats: {
      totalTargetsStruck: 2500,
      provincesHit: 26,
      confirmedKilled: 3500,
      keyTargets: 'Khamenei eliminated, dozens of senior military figures',
    },
    sources: 'ACLED, Al Jazeera live tracker',
    keyEvents: [
      { date: 'Feb 28', event: 'US-Israel joint strikes begin, Khamenei killed' },
      { date: 'Mar 2026', event: 'Strikes in 26 of 31 Iranian provinces' },
    ],
    status: 'ACTIVE',
  },
  {
    id: 'yemen',
    name: 'Yemen (Houthis)',
    period: 'Jan 2024 -- Present',
    belligerents: ['United States', 'United Kingdom', 'Ansar Allah (Houthis)'],
    stats: {
      totalTargetsStruck: 1500,
      opPoseidonArcher: 400,
      opRoughRider: 1100,
      confirmedKilled: 650,
      dronesLost: 7,
      costUSD: '1+ billion',
      ballisticLaunchReduction: '69%',
      droneAttackReduction: '55%',
    },
    sources: 'CENTCOM official statements, Pentagon (1,000+ targets confirmed Apr 2025)',
    keyEvents: [
      { date: 'Jan 2024', event: 'Operation Poseidon Archer begins (Biden)' },
      { date: 'Mar 15, 2025', event: 'Operation Rough Rider begins (Trump), 1,100+ targets in 52 days' },
      { date: 'May 6, 2025', event: 'Ceasefire declared' },
      { date: 'Mar 28, 2026', event: 'Houthis resume attacks amid 2026 Iran war' },
    ],
    status: 'ESCALATING',
  },
  {
    id: 'syria',
    name: 'Syria',
    period: 'Oct 2023 -- Present',
    belligerents: ['Israel (IDF)', 'Iranian proxies', 'Former Assad regime'],
    stats: {
      totalTargetsStruck: 800,
      confirmedKilled: 500,
      keyOperations: 'Embassy strike (Apr 2024), 100+ strikes in single day (Dec 9, 2024)',
    },
    sources: 'ACLED, IDF statements',
    keyEvents: [
      { date: 'Apr 1, 2024', event: 'Israeli strike on Iranian embassy in Damascus' },
      { date: 'Dec 9, 2024', event: '100+ airstrikes across Syria in single day, Port of Latakia hit' },
    ],
    status: 'ACTIVE',
  },
];

const AGGREGATE_STATS = {
  totalTargetsAllTheatres: 49258,
  totalConfirmedKilled: 86924,
  activeTheatres: 6,
  countriesAffected: 8,
  nuclearFacilitiesStruck: 6,
  seniorCommandersEliminated: 60,
  navalOperations: 3,
  airDefenseSuppressed: 70,
};

interface StatTileProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  pulse?: boolean;
}

function StatTile({ label, value, subValue, icon, pulse }: StatTileProps) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 6,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0,
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 0.3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#999', display: 'flex', alignItems: 'center' }}>{icon}</span>
        <span style={{
          fontSize: 9, color: '#777', textTransform: 'uppercase',
          letterSpacing: 1, fontWeight: 600,
        }}>
          {label}
        </span>
        {pulse && (
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: '#e0e0e0',
            animation: 'warDashPulse 2s ease-in-out infinite',
          }} />
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#e0e0e0', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subValue && (
        <div style={{ fontSize: 10, color: '#666' }}>{subValue}</div>
      )}
    </div>
  );
}

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  span?: number;
}

function ChartCard({ title, children, span = 1 }: ChartCardProps) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 6,
      padding: 16,
      gridColumn: span > 1 ? `span ${span}` : undefined,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: '#888',
        textTransform: 'uppercase', letterSpacing: 1,
        paddingBottom: 8,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

const SVG_ICONS = {
  crosshair: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/>
    </svg>
  ),
  skull: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="10" r="8"/><path d="M8 22v-4"/><path d="M16 22v-4"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/><circle cx="15" cy="9" r="1.5" fill="currentColor"/><path d="M9 14h6"/>
    </svg>
  ),
  globe: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  ship: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>
      <path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/>
      <path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/>
      <path d="M12 1v4"/>
    </svg>
  ),
  building: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
    </svg>
  ),
  shield: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  target: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  ),
  alert: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  anchor: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/>
    </svg>
  ),
  users: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  zap: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  mapPin: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  activity: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  check: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  tool: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  x: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: '#ccc',
    CONCLUDED: '#888',
    ESCALATING: '#fff',
  };
  const bgs: Record<string, string> = {
    ACTIVE: 'rgba(255,255,255,0.08)',
    CONCLUDED: 'rgba(255,255,255,0.04)',
    ESCALATING: 'rgba(255,255,255,0.15)',
  };
  return (
    <span style={{
      fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
      background: bgs[status] || bgs.ACTIVE,
      color: colors[status] || colors.ACTIVE,
      textTransform: 'uppercase', letterSpacing: 0.8,
      border: `1px solid ${status === 'ESCALATING' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
    }}>
      {status}
    </span>
  );
}

export default function WarDashboard({ onClose }: WarDashboardProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const { data, loading, error, refetch } = useWarDashboard(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    setLastUpdate(new Date());
  }, [data]);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 1100,
      background: 'rgba(5, 5, 8, 0.97)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: '#ccc',
              animation: 'warDashPulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e0e0e0', letterSpacing: 1.5 }}>
              WAR DASHBOARD
            </span>
          </div>
          <span style={{
            fontSize: 8, color: '#555', padding: '2px 8px',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3,
            letterSpacing: 0.5,
          }}>
            OSINT AGGREGATED
          </span>
          <span style={{ fontSize: 9, color: '#444' }}>
            Updated {lastUpdate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={refetch} style={{
            padding: '5px 12px', fontSize: 9, fontWeight: 600,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4, color: '#999', cursor: 'pointer',
            letterSpacing: 0.5, transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            REFRESH
          </button>
          <button onClick={onClose} style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4, color: '#666', cursor: 'pointer', fontSize: 14,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#666'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
          >
            {SVG_ICONS.x}
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 0, padding: '0 20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}>
        {TAB_ITEMS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 16px', fontSize: 10, fontWeight: 600,
            color: tab === t.key ? '#e0e0e0' : '#555',
            background: 'transparent',
            border: 'none', borderBottom: `2px solid ${tab === t.key ? '#999' : 'transparent'}`,
            cursor: 'pointer', letterSpacing: 1,
            transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {loading && !data && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: '#555', fontSize: 11,
          }}>
            Loading war dashboard data...
          </div>
        )}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: '#999', fontSize: 11,
          }}>
            {error}
          </div>
        )}
        {tab === 'overview' && <OverviewTab data={data} />}
        {tab === 'theatres' && <TheatresTab />}
        {data && tab === 'forces' && <ForcesTab data={data} />}
        {data && tab === 'infrastructure' && <InfrastructureTab data={data} />}
      </div>

      <style>{`
        @keyframes warDashPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

function OverviewTab({ data }: { data: ReturnType<typeof useWarDashboard>['data'] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 10,
      }}>
        <StatTile
          label="Total Targets Struck"
          value={AGGREGATE_STATS.totalTargetsAllTheatres}
          subValue="All theatres combined (confirmed)"
          icon={SVG_ICONS.crosshair}
          pulse
        />
        <StatTile
          label="Confirmed Killed"
          value={AGGREGATE_STATS.totalConfirmedKilled}
          subValue="All theatres combined"
          icon={SVG_ICONS.skull}
        />
        <StatTile
          label="Active Theatres"
          value={AGGREGATE_STATS.activeTheatres}
          subValue="Gaza, Lebanon, Iran, Yemen, Syria, Iraq"
          icon={SVG_ICONS.globe}
        />
        <StatTile
          label="Countries Affected"
          value={AGGREGATE_STATS.countriesAffected}
          subValue="Direct military operations"
          icon={SVG_ICONS.mapPin}
        />
        <StatTile
          label="Naval Vessels"
          value={data?.summary.navalVessels || '--'}
          subValue="Active fleet deployments"
          icon={SVG_ICONS.anchor}
        />
        <StatTile
          label="Military Bases"
          value={data?.summary.militaryBases || '--'}
          subValue="Active installations tracked"
          icon={SVG_ICONS.building}
        />
        <StatTile
          label="Senior Commanders"
          value={AGGREGATE_STATS.seniorCommandersEliminated}
          subValue="Eliminated across all theatres"
          icon={SVG_ICONS.target}
        />
        <StatTile
          label="Nuclear Sites Struck"
          value={AGGREGATE_STATS.nuclearFacilitiesStruck}
          subValue="Fordow, Natanz, Isfahan, Arak + 2"
          icon={SVG_ICONS.zap}
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 14,
      }}>
        <ChartCard title="Targets Struck by Theatre">
          <TheatreBreakdownChart />
        </ChartCard>
        <ChartCard title="Conflict Timeline">
          <ConflictTimeline />
        </ChartCard>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 14,
      }}>
        {data && (
          <ChartCard title="Live Strike Data (30 Days)">
            <StrikeTimelineChart data={data.timeline} />
          </ChartCard>
        )}
        {data && (
          <ChartCard title="Strikes by Origin (DB Records)">
            <StrikesByCountryChart data={data.strikesByCountry} />
          </ChartCard>
        )}
      </div>

      <ChartCard title="Key Figures by Theatre">
        <TheatreStatsTable />
      </ChartCard>
    </div>
  );
}

function TheatreBreakdownChart() {
  const theatres = [
    { label: 'Gaza', value: 31000 },
    { label: 'Lebanon', value: 12650 },
    { label: 'Iran (2026)', value: 2500 },
    { label: 'Yemen', value: 1500 },
    { label: 'Syria', value: 800 },
    { label: 'Iran (12-Day)', value: 508 },
  ];
  const max = Math.max(...theatres.map(t => t.value));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {theatres.map(t => (
        <div key={t.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 80, fontSize: 10, color: '#aaa', textAlign: 'right',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {t.label}
          </span>
          <div style={{
            flex: 1, height: 22, background: 'rgba(255,255,255,0.04)',
            borderRadius: 3, overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              width: `${Math.max((t.value / max) * 100, 2)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.08))',
              borderRadius: 3,
              transition: 'width 0.8s ease-out',
            }} />
            <span style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              fontSize: 10, color: '#ccc', fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {t.value.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConflictTimeline() {
  const events = [
    { date: 'Oct 2023', event: 'Hamas attacks Israel; IDF begins Gaza campaign', intensity: 100 },
    { date: 'Jan 2024', event: 'US begins Houthi strikes (Op Poseidon Archer)', intensity: 30 },
    { date: 'Apr 2024', event: 'Israeli strike on Iranian embassy, Damascus', intensity: 40 },
    { date: 'Sep 2024', event: 'Pager attacks; massive Lebanon airstrike campaign', intensity: 85 },
    { date: 'Oct 2024', event: 'Israel strikes Iran (100+ aircraft)', intensity: 50 },
    { date: 'Dec 2024', event: '100+ airstrikes across Syria in single day', intensity: 45 },
    { date: 'Mar 2025', event: 'Op Rough Rider: 1,100+ Houthi targets in 52 days', intensity: 60 },
    { date: 'Jun 2025', event: 'Twelve-Day War: 508 strikes across 27 Iranian provinces', intensity: 90 },
    { date: 'Feb 2026', event: '2026 Iran War begins; Khamenei eliminated', intensity: 95 },
    { date: 'Mar 2026', event: '2026 Lebanon War resumes; Houthis escalate', intensity: 80 },
    { date: 'Apr 2026', event: '254 killed in single-day Beirut strikes', intensity: 70 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {events.map((e, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '5px 0',
          borderLeft: '2px solid rgba(255,255,255,0.08)',
          paddingLeft: 12,
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', left: -4, top: 8,
            width: 6, height: 6, borderRadius: '50%',
            background: `rgba(255,255,255,${0.15 + (e.intensity / 100) * 0.5})`,
          }} />
          <span style={{
            fontSize: 9, color: '#666', fontWeight: 600, minWidth: 60, flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {e.date}
          </span>
          <span style={{ fontSize: 10, color: '#bbb', lineHeight: 1.4 }}>{e.event}</span>
        </div>
      ))}
    </div>
  );
}

function TheatreStatsTable() {
  const rows = [
    { theatre: 'Gaza', targets: '31,000+', killed: '75,227+', period: 'Oct 2023--', source: 'IDF, ACLED' },
    { theatre: 'Lebanon', targets: '12,650+', killed: '5,547+', period: 'Oct 2023--', source: 'ACLED, LHM' },
    { theatre: 'Iran (2026)', targets: '2,500+', killed: '3,500+', period: 'Feb 2026--', source: 'ACLED, AJ' },
    { theatre: 'Yemen', targets: '1,500+', killed: '650+', period: 'Jan 2024--', source: 'CENTCOM' },
    { theatre: 'Syria', targets: '800+', killed: '500+', period: 'Oct 2023--', source: 'IDF, ACLED' },
    { theatre: 'Iran (12-Day)', targets: '508', killed: '1,500+', period: 'Jun 2025', source: 'ACLED, TOI' },
  ];

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {['Theatre', 'Targets Struck', 'Confirmed Killed', 'Period', 'Source'].map(h => (
              <th key={h} style={{
                padding: '8px 12px', textAlign: 'left', color: '#666',
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 9,
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.theatre} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <td style={{ padding: '7px 12px', color: '#ccc', fontWeight: 600 }}>{r.theatre}</td>
              <td style={{ padding: '7px 12px', color: '#e0e0e0', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{r.targets}</td>
              <td style={{ padding: '7px 12px', color: '#aaa', fontVariantNumeric: 'tabular-nums' }}>{r.killed}</td>
              <td style={{ padding: '7px 12px', color: '#777' }}>{r.period}</td>
              <td style={{ padding: '7px 12px', color: '#555', fontSize: 9 }}>{r.source}</td>
            </tr>
          ))}
          <tr style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <td style={{ padding: '8px 12px', color: '#ccc', fontWeight: 700 }}>TOTAL</td>
            <td style={{ padding: '8px 12px', color: '#fff', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>49,000+</td>
            <td style={{ padding: '8px 12px', color: '#ccc', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>86,900+</td>
            <td style={{ padding: '8px 12px', color: '#777' }}>Oct 2023--</td>
            <td style={{ padding: '8px 12px', color: '#555', fontSize: 9 }}>Multiple</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TheatresTab() {
  const [expanded, setExpanded] = useState<string | null>('gaza');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {THEATRE_DATA.map(theatre => {
        const isExpanded = expanded === theatre.id;
        return (
          <div key={theatre.id} style={{
            background: 'rgba(255,255,255,0.02)',
            border: `1px solid rgba(255,255,255,${isExpanded ? 0.1 : 0.05})`,
            borderRadius: 6,
            overflow: 'hidden',
            transition: 'border-color 0.2s',
          }}>
            <button
              onClick={() => setExpanded(isExpanded ? null : theatre.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: 'none', border: 'none',
                cursor: 'pointer', color: '#ccc', textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#888', display: 'flex' }}>{SVG_ICONS.crosshair}</span>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>{theatre.name}</span>
                <StatusBadge status={theatre.status} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 10, color: '#666' }}>{theatre.period}</span>
                <span style={{
                  fontSize: 14, fontWeight: 700, color: '#ddd',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {theatre.stats.totalTargetsStruck?.toLocaleString() || '--'} targets
                </span>
                <span style={{
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s', color: '#666', fontSize: 12,
                }}>
                  &#x25BC;
                </span>
              </div>
            </button>

            {isExpanded && (
              <div style={{
                padding: '0 16px 16px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 12, marginTop: 12,
                }}>
                  <div>
                    <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                      Belligerents
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {theatre.belligerents.map(b => (
                        <span key={b} style={{
                          fontSize: 9, padding: '2px 8px', borderRadius: 3,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          color: '#aaa',
                        }}>
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                      Key Statistics
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {Object.entries(theatre.stats).map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 10, color: '#777' }}>
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                          </span>
                          <span style={{ fontSize: 10, color: '#ccc', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {typeof val === 'number' ? val.toLocaleString() : val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
                      Key Events
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {theatre.keyEvents.map((e, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8 }}>
                          <span style={{ fontSize: 9, color: '#555', minWidth: 64, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                            {e.date}
                          </span>
                          <span style={{ fontSize: 9, color: '#aaa', lineHeight: 1.4 }}>{e.event}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {'iranRetaliation' in theatre && theatre.iranRetaliation && (
                  <div style={{
                    marginTop: 12, padding: 12,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 4,
                  }}>
                    <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>
                      Iranian Retaliation
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                      {Object.entries(theatre.iranRetaliation).map(([k, v]) => (
                        <div key={k}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#ccc' }}>
                            {typeof v === 'number' ? v.toLocaleString() : v}{k === 'interceptionRate' ? '%' : ''}
                          </div>
                          <div style={{ fontSize: 9, color: '#666' }}>
                            {k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 8, fontSize: 9, color: '#444' }}>
                  Sources: {theatre.sources}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ForcesTab({ data }: { data: NonNullable<ReturnType<typeof useWarDashboard>['data']> }) {
  const usVessels = data.navalAssets.filter(a => a.operator === 'US Navy');
  const otherVessels = data.navalAssets.filter(a => a.operator !== 'US Navy');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 10,
      }}>
        <StatTile
          label="US Navy Vessels"
          value={usVessels.length}
          subValue={`${usVessels.filter(v => v.asset_type === 'carrier').length} carriers, ${usVessels.filter(v => v.asset_type === 'destroyer').length} destroyers`}
          icon={SVG_ICONS.ship}
          pulse
        />
        <StatTile
          label="Allied Vessels"
          value={otherVessels.filter(a => !a.operator.includes('Iran') && !a.operator.includes('IRGC')).length}
          subValue="UK, France, coalition"
          icon={SVG_ICONS.users}
        />
        <StatTile
          label="Adversary Vessels"
          value={otherVessels.filter(a => a.operator.includes('Iran') || a.operator.includes('IRGC')).length}
          subValue="Iran, IRGC Navy"
          icon={SVG_ICONS.alert}
        />
        <StatTile
          label="Regions Covered"
          value={new Set(data.navalAssets.map(a => a.region)).size}
          subValue={[...new Set(data.navalAssets.map(a => a.region))].slice(0, 3).join(', ')}
          icon={SVG_ICONS.globe}
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 14,
      }}>
        <ChartCard title="Naval Order of Battle" span={2}>
          <NavalOrbatChart assets={data.navalAssets} />
        </ChartCard>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 14,
      }}>
        <ChartCard title="Force Composition by Operator">
          <ForceCompositionChart
            navalByOperator={data.navalByOperator}
            basesByOperator={data.basesByOperator}
          />
        </ChartCard>
        <ChartCard title="US Navy Deployment">
          <USDeploymentTable vessels={usVessels} />
        </ChartCard>
      </div>
    </div>
  );
}

function USDeploymentTable({ vessels }: { vessels: NonNullable<ReturnType<typeof useWarDashboard>['data']>['navalAssets'] }) {
  const byRegion: Record<string, typeof vessels> = {};
  for (const v of vessels) {
    if (!byRegion[v.region]) byRegion[v.region] = [];
    byRegion[v.region].push(v);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Object.entries(byRegion).map(([region, ships]) => (
        <div key={region}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
          }}>
            <div style={{ width: 3, height: 12, borderRadius: 1, background: '#888' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: '#bbb', letterSpacing: 0.3 }}>
              {region}
            </span>
            <span style={{ fontSize: 9, color: '#666' }}>({ships.length})</span>
          </div>
          {ships.map(s => (
            <div key={s.name} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '4px 8px 4px 16px', fontSize: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#bbb', fontWeight: 500 }}>{s.name}</span>
                <span style={{ color: '#555', fontSize: 9 }}>{s.hull_number}</span>
              </div>
              <span style={{ color: '#666', fontSize: 9 }}>{s.class_name}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function InfrastructureTab({ data }: { data: NonNullable<ReturnType<typeof useWarDashboard>['data']> }) {
  const { summary } = data;
  const damagePct = summary.infraTotal > 0
    ? Math.round(((summary.infraDamaged + summary.infraDestroyed) / summary.infraTotal) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
        gap: 10,
      }}>
        <StatTile
          label="Sites Monitored"
          value={summary.infraTotal}
          icon={SVG_ICONS.mapPin}
        />
        <StatTile
          label="Intact"
          value={summary.infraIntact}
          subValue={`${summary.infraTotal > 0 ? Math.round((summary.infraIntact / summary.infraTotal) * 100) : 0}% operational`}
          icon={SVG_ICONS.check}
        />
        <StatTile
          label="Damaged"
          value={summary.infraDamaged}
          subValue={`${summary.infraTotal > 0 ? Math.round((summary.infraDamaged / summary.infraTotal) * 100) : 0}% of total`}
          icon={SVG_ICONS.tool}
        />
        <StatTile
          label="Destroyed"
          value={summary.infraDestroyed}
          subValue={`${summary.infraTotal > 0 ? Math.round((summary.infraDestroyed / summary.infraTotal) * 100) : 0}% of total`}
          icon={SVG_ICONS.x}
          pulse
        />
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 6,
        padding: 16,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 600, color: '#888',
          textTransform: 'uppercase', letterSpacing: 1,
          marginBottom: 12,
        }}>
          Overall Damage Assessment
        </div>
        <div style={{
          height: 24, background: 'rgba(255,255,255,0.04)',
          borderRadius: 4, overflow: 'hidden', display: 'flex',
        }}>
          {summary.infraIntact > 0 && (
            <div style={{
              width: `${(summary.infraIntact / summary.infraTotal) * 100}%`,
              height: '100%', background: 'rgba(255,255,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'width 1s ease-out',
            }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#fff' }}>
                {Math.round((summary.infraIntact / summary.infraTotal) * 100)}%
              </span>
            </div>
          )}
          {summary.infraDamaged > 0 && (
            <div style={{
              width: `${(summary.infraDamaged / summary.infraTotal) * 100}%`,
              height: '100%', background: 'rgba(255,255,255,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'width 1s ease-out',
            }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#ccc' }}>
                {Math.round((summary.infraDamaged / summary.infraTotal) * 100)}%
              </span>
            </div>
          )}
          {summary.infraDestroyed > 0 && (
            <div style={{
              width: `${(summary.infraDestroyed / summary.infraTotal) * 100}%`,
              height: '100%', background: 'rgba(255,255,255,0.05)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'width 1s ease-out',
            }}>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#999' }}>
                {Math.round((summary.infraDestroyed / summary.infraTotal) * 100)}%
              </span>
            </div>
          )}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8,
        }}>
          {[
            { label: 'Intact', shade: 'rgba(255,255,255,0.25)', count: summary.infraIntact },
            { label: 'Damaged', shade: 'rgba(255,255,255,0.12)', count: summary.infraDamaged },
            { label: 'Destroyed', shade: 'rgba(255,255,255,0.05)', count: summary.infraDestroyed },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: item.shade }} />
              <span style={{ fontSize: 9, color: '#777' }}>{item.label} ({item.count})</span>
            </div>
          ))}
        </div>
      </div>

      <ChartCard title="Infrastructure Status by Type">
        <InfraStatusChart data={data.infraByTypeStatus} />
      </ChartCard>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 14,
      }}>
        <ChartCard title="Damage Summary">
          <div style={{ fontSize: 11, color: '#aaa', lineHeight: 1.8 }}>
            <span style={{ color: '#ddd', fontWeight: 700 }}>{damagePct}%</span> of monitored
            infrastructure has sustained damage or been destroyed.
            Critical sectors most affected include pipelines, airports, and power grid facilities.
            <br />
            <span style={{ color: '#ccc', fontWeight: 600 }}>{summary.infraDestroyed}</span>{' '}
            sites reported fully destroyed.{' '}
            <span style={{ color: '#bbb', fontWeight: 600 }}>{summary.infraDamaged}</span>{' '}
            sites reporting partial damage.
          </div>
        </ChartCard>
        <ChartCard title="Critical Alerts">
          <CriticalAlertsList data={data.infraByTypeStatus} />
        </ChartCard>
      </div>
    </div>
  );
}

function CriticalAlertsList({ data }: { data: NonNullable<ReturnType<typeof useWarDashboard>['data']>['infraByTypeStatus'] }) {
  const destroyed = data.filter(d => d.status === 'destroyed').sort((a, b) => b.cnt - a.cnt);
  const damaged = data.filter(d => d.status === 'damaged' && d.cnt >= 2).sort((a, b) => b.cnt - a.cnt);

  const alerts = [
    ...destroyed.map(d => ({
      severity: 'critical' as const,
      text: `${d.cnt} ${INFRA_LABELS_INLINE[d.infra_type] || d.infra_type} site(s) DESTROYED`,
    })),
    ...damaged.map(d => ({
      severity: 'warning' as const,
      text: `${d.cnt} ${INFRA_LABELS_INLINE[d.infra_type] || d.infra_type} site(s) damaged`,
    })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflow: 'auto' }}>
      {alerts.length === 0 && <div style={{ color: '#555', fontSize: 10 }}>No critical alerts</div>}
      {alerts.map((a, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', borderRadius: 4,
          background: a.severity === 'critical' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
          borderLeft: `3px solid ${a.severity === 'critical' ? '#ccc' : '#666'}`,
        }}>
          <span style={{
            fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 2,
            background: a.severity === 'critical' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)',
            color: a.severity === 'critical' ? '#fff' : '#ccc',
            textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            {a.severity}
          </span>
          <span style={{ fontSize: 10, color: '#bbb' }}>{a.text}</span>
        </div>
      ))}
    </div>
  );
}

const INFRA_LABELS_INLINE: Record<string, string> = {
  airport: 'airport',
  port: 'port',
  pipeline: 'pipeline',
  electricity: 'power grid',
  refinery: 'refinery',
  nuclear: 'nuclear',
  telecom: 'telecom',
  water: 'water',
  highway: 'highway',
  government: 'government',
  military_intel: 'military/intel',
  undersea_cable: 'subsea cable',
};
