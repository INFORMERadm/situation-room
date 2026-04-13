import { useState } from 'react';
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

type Tab = 'overview' | 'forces' | 'infrastructure';

const TAB_ITEMS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'OVERVIEW' },
  { key: 'forces', label: 'FORCE POSTURE' },
  { key: 'infrastructure', label: 'INFRASTRUCTURE' },
];

interface StatTileProps {
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
  icon: string;
  pulse?: boolean;
}

function StatTile({ label, value, subValue, color, icon, pulse }: StatTileProps) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.6)',
      border: `1px solid ${color}30`,
      borderRadius: 8,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0,
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color 0.3s',
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: `${color}08`,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{
          fontSize: 9, color: '#999', textTransform: 'uppercase',
          letterSpacing: 1, fontWeight: 600,
        }}>
          {label}
        </span>
        {pulse && (
          <span style={{
            width: 6, height: 6, borderRadius: '50%', background: color,
            animation: 'warDashPulse 2s ease-in-out infinite',
          }} />
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subValue && (
        <div style={{ fontSize: 10, color: '#888' }}>{subValue}</div>
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
      background: 'rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      padding: 16,
      gridColumn: span > 1 ? `span ${span}` : undefined,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: '#aaa',
        textTransform: 'uppercase', letterSpacing: 1,
        paddingBottom: 8,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function WarDashboard({ onClose }: WarDashboardProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const { data, loading, error, refetch } = useWarDashboard(true);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 1100,
      background: 'rgba(5, 5, 8, 0.96)',
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
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#ff1744',
              animation: 'warDashPulse 2s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>
              WAR DASHBOARD
            </span>
          </div>
          <span style={{
            fontSize: 9, color: '#666', padding: '2px 8px',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4,
          }}>
            CLASSIFIED // OSINT AGGREGATED
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={refetch} style={{
            padding: '5px 12px', fontSize: 10, fontWeight: 600,
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4, color: '#ccc', cursor: 'pointer',
            letterSpacing: 0.5, transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            REFRESH
          </button>
          <button onClick={onClose} style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 4, color: '#999', cursor: 'pointer', fontSize: 16,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,23,68,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#999'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            x
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 2, padding: '0 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        {TAB_ITEMS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 16px', fontSize: 10, fontWeight: 600,
            color: tab === t.key ? '#fff' : '#666',
            background: 'transparent',
            border: 'none', borderBottom: `2px solid ${tab === t.key ? '#ff1744' : 'transparent'}`,
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
            height: '100%', color: '#666', fontSize: 12,
          }}>
            Loading war dashboard data...
          </div>
        )}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            height: '100%', color: '#f44336', fontSize: 12,
          }}>
            {error}
          </div>
        )}
        {data && tab === 'overview' && <OverviewTab data={data} />}
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

function OverviewTab({ data }: { data: NonNullable<ReturnType<typeof useWarDashboard>['data']> }) {
  const { summary } = data;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}>
        <StatTile
          label="Total Strike Events"
          value={summary.totalStrikes}
          subValue={`${summary.uniqueTargets} unique targets`}
          color="#ff1744"
          icon="&#x1F4A5;"
          pulse
        />
        <StatTile
          label="Projectiles Launched"
          value={summary.totalProjectiles}
          subValue="Across all theatres"
          color="#ff9100"
          icon="&#x1F680;"
        />
        <StatTile
          label="Naval Vessels Deployed"
          value={summary.navalVessels}
          subValue="Active fleet presence"
          color="#00bcd4"
          icon="&#x2693;"
        />
        <StatTile
          label="Military Bases"
          value={summary.militaryBases}
          subValue="Active installations"
          color="#4caf50"
          icon="&#x1F3ED;"
        />
        <StatTile
          label="Infrastructure Damaged"
          value={summary.infraDamaged}
          subValue={`${summary.infraDestroyed} destroyed`}
          color="#ff9800"
          icon="&#x26A0;"
        />
        <StatTile
          label="Infrastructure Intact"
          value={summary.infraIntact}
          subValue={`of ${summary.infraTotal} total sites`}
          color="#4caf50"
          icon="&#x1F3D7;"
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 16,
      }}>
        <ChartCard title="Strikes by Origin">
          <StrikesByCountryChart data={data.strikesByCountry} />
        </ChartCard>
        <ChartCard title="Strike Activity (30 Days)">
          <StrikeTimelineChart data={data.timeline} />
        </ChartCard>
      </div>
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}>
        <StatTile
          label="US Navy Vessels"
          value={usVessels.length}
          subValue={`${usVessels.filter(v => v.asset_type === 'carrier').length} carriers, ${usVessels.filter(v => v.asset_type === 'destroyer').length} destroyers`}
          color="#4caf50"
          icon="&#x1F1FA;&#x1F1F8;"
          pulse
        />
        <StatTile
          label="Allied Vessels"
          value={otherVessels.filter(a => !a.operator.includes('Iran') && !a.operator.includes('IRGC')).length}
          subValue="UK, France, coalition"
          color="#00bcd4"
          icon="&#x1F91D;"
        />
        <StatTile
          label="Adversary Vessels"
          value={otherVessels.filter(a => a.operator.includes('Iran') || a.operator.includes('IRGC')).length}
          subValue="Iran, IRGC Navy"
          color="#f44336"
          icon="&#x26A0;"
        />
        <StatTile
          label="Regions Covered"
          value={new Set(data.navalAssets.map(a => a.region)).size}
          subValue={[...new Set(data.navalAssets.map(a => a.region))].slice(0, 3).join(', ')}
          color="#2196f3"
          icon="&#x1F30D;"
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 16,
      }}>
        <ChartCard title="Naval Order of Battle" span={2}>
          <NavalOrbatChart assets={data.navalAssets} />
        </ChartCard>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 16,
      }}>
        <ChartCard title="Force Composition by Operator">
          <ForceCompositionChart
            navalByOperator={data.navalByOperator}
            basesByOperator={data.basesByOperator}
          />
        </ChartCard>
        <ChartCard title="US Navy Deployment Map">
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

  const regionColors: Record<string, string> = {
    'Persian Gulf': '#4caf50',
    'Gulf of Oman': '#2196f3',
    'Strait of Hormuz': '#ff9800',
    'Red Sea': '#f44336',
    'Gulf of Aden': '#e91e63',
    'Eastern Mediterranean': '#00bcd4',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Object.entries(byRegion).map(([region, ships]) => {
        const color = regionColors[region] || '#78909c';
        return (
          <div key={region}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4,
            }}>
              <div style={{ width: 4, height: 14, borderRadius: 2, background: color }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#ddd', letterSpacing: 0.3 }}>
                {region}
              </span>
              <span style={{ fontSize: 9, color: '#888' }}>({ships.length})</span>
            </div>
            {ships.map(s => (
              <div key={s.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 8px 4px 16px', fontSize: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: '#ccc', fontWeight: 500 }}>{s.name}</span>
                  <span style={{ color: '#666', fontSize: 9 }}>{s.hull_number}</span>
                </div>
                <span style={{ color: '#888', fontSize: 9 }}>{s.class_name}</span>
              </div>
            ))}
          </div>
        );
      })}
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
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}>
        <StatTile
          label="Total Sites Monitored"
          value={summary.infraTotal}
          color="#2196f3"
          icon="&#x1F4CD;"
        />
        <StatTile
          label="Intact"
          value={summary.infraIntact}
          subValue={`${summary.infraTotal > 0 ? Math.round((summary.infraIntact / summary.infraTotal) * 100) : 0}% operational`}
          color="#4caf50"
          icon="&#x2705;"
        />
        <StatTile
          label="Damaged"
          value={summary.infraDamaged}
          subValue={`${summary.infraTotal > 0 ? Math.round((summary.infraDamaged / summary.infraTotal) * 100) : 0}% of total`}
          color="#ff9800"
          icon="&#x1F527;"
        />
        <StatTile
          label="Destroyed"
          value={summary.infraDestroyed}
          subValue={`${summary.infraTotal > 0 ? Math.round((summary.infraDestroyed / summary.infraTotal) * 100) : 0}% of total`}
          color="#f44336"
          icon="&#x1F4A2;"
          pulse
        />
      </div>

      <div style={{
        background: 'rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        padding: 16,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 600, color: '#aaa',
          textTransform: 'uppercase', letterSpacing: 1,
          marginBottom: 12,
        }}>
          Overall Damage Assessment
        </div>
        <div style={{
          height: 28, background: 'rgba(255,255,255,0.05)',
          borderRadius: 6, overflow: 'hidden', display: 'flex',
        }}>
          {summary.infraIntact > 0 && (
            <div style={{
              width: `${(summary.infraIntact / summary.infraTotal) * 100}%`,
              height: '100%', background: '#4caf50',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'width 1s ease-out',
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>
                {Math.round((summary.infraIntact / summary.infraTotal) * 100)}%
              </span>
            </div>
          )}
          {summary.infraDamaged > 0 && (
            <div style={{
              width: `${(summary.infraDamaged / summary.infraTotal) * 100}%`,
              height: '100%', background: '#ff9800',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'width 1s ease-out',
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>
                {Math.round((summary.infraDamaged / summary.infraTotal) * 100)}%
              </span>
            </div>
          )}
          {summary.infraDestroyed > 0 && (
            <div style={{
              width: `${(summary.infraDestroyed / summary.infraTotal) * 100}%`,
              height: '100%', background: '#f44336',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'width 1s ease-out',
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: '#fff' }}>
                {Math.round((summary.infraDestroyed / summary.infraTotal) * 100)}%
              </span>
            </div>
          )}
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8,
        }}>
          {[
            { label: 'Intact', color: '#4caf50', count: summary.infraIntact },
            { label: 'Damaged', color: '#ff9800', count: summary.infraDamaged },
            { label: 'Destroyed', color: '#f44336', count: summary.infraDestroyed },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
              <span style={{ fontSize: 9, color: '#999' }}>{item.label} ({item.count})</span>
            </div>
          ))}
        </div>
      </div>

      <ChartCard title="Infrastructure Status by Type">
        <InfraStatusChart data={data.infraByTypeStatus} />
      </ChartCard>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 16,
      }}>
        <ChartCard title="Damage Summary">
          <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.8 }}>
            <span style={{ color: '#ff9800', fontWeight: 700 }}>{damagePct}%</span> of monitored
            infrastructure has sustained damage or been destroyed.
            Critical sectors most affected include{' '}
            <span style={{ color: '#ff9800' }}>pipelines</span>,{' '}
            <span style={{ color: '#ff9800' }}>airports</span>, and{' '}
            <span style={{ color: '#ff9800' }}>power grid</span> facilities.
            <br />
            <span style={{ color: '#f44336', fontWeight: 600 }}>{summary.infraDestroyed}</span>{' '}
            sites reported fully destroyed.{' '}
            <span style={{ color: '#ff9800', fontWeight: 600 }}>{summary.infraDamaged}</span>{' '}
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
      {alerts.length === 0 && <div style={{ color: '#666', fontSize: 11 }}>No critical alerts</div>}
      {alerts.map((a, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px', borderRadius: 4,
          background: a.severity === 'critical' ? 'rgba(244,67,54,0.1)' : 'rgba(255,152,0,0.08)',
          borderLeft: `3px solid ${a.severity === 'critical' ? '#f44336' : '#ff9800'}`,
        }}>
          <span style={{
            fontSize: 8, fontWeight: 700, padding: '1px 4px', borderRadius: 2,
            background: a.severity === 'critical' ? '#f44336' : '#ff9800',
            color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5,
          }}>
            {a.severity}
          </span>
          <span style={{ fontSize: 10, color: '#ccc' }}>{a.text}</span>
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
