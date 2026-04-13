import { useState } from 'react';
import type { StrikeCountrySummary, InfraTypeSummary, TimelinePoint, NavalAssetSummary } from '../../hooks/useWarDashboard';

const COUNTRY_COLORS: Record<string, string> = {
  Iran: '#f44336',
  Israel: '#2196f3',
  US: '#4caf50',
  Yemen: '#ff9800',
  Russia: '#9c27b0',
  Ukraine: '#ffc107',
  Hezbollah: '#e91e63',
  UK: '#00bcd4',
};

function getCountryColor(country: string): string {
  for (const [key, color] of Object.entries(COUNTRY_COLORS)) {
    if (country.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#78909c';
}

const INFRA_LABELS: Record<string, string> = {
  airport: 'Airports',
  port: 'Ports',
  pipeline: 'Pipelines',
  electricity: 'Power Grid',
  refinery: 'Refineries',
  nuclear: 'Nuclear',
  telecom: 'Telecom',
  water: 'Water',
  highway: 'Highways',
  government: 'Government',
  military_intel: 'Military/Intel',
  undersea_cable: 'Subsea Cables',
};

const STATUS_COLORS: Record<string, string> = {
  intact: '#4caf50',
  damaged: '#ff9800',
  destroyed: '#f44336',
};

interface BarChartProps {
  data: { label: string; value: number; color: string }[];
  maxValue?: number;
  height?: number;
  showValues?: boolean;
}

function HorizontalBarChart({ data, maxValue, height = 24, showValues = true }: BarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 80, fontSize: 10, color: '#ccc', textAlign: 'right',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {d.label}
          </span>
          <div style={{
            flex: 1, height, background: 'rgba(255,255,255,0.05)',
            borderRadius: 4, overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              width: `${Math.max((d.value / max) * 100, 2)}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${d.color}dd, ${d.color}88)`,
              borderRadius: 4,
              transition: 'width 0.8s ease-out',
            }} />
            {showValues && (
              <span style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                fontSize: 10, color: '#fff', fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.8)',
              }}>
                {d.value.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface StrikesByCountryChartProps {
  data: StrikeCountrySummary[];
}

export function StrikesByCountryChart({ data }: StrikesByCountryChartProps) {
  const [metric, setMetric] = useState<'strikes' | 'projectiles'>('strikes');
  const top = data.filter(d => d.source_country && d.total_strikes > 5).slice(0, 8);

  const barData = top.map(d => ({
    label: d.source_country,
    value: metric === 'strikes' ? d.total_strikes : d.total_projectiles,
    color: getCountryColor(d.source_country),
  }));

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {(['strikes', 'projectiles'] as const).map(m => (
          <button key={m} onClick={() => setMetric(m)} style={{
            padding: '3px 10px', fontSize: 10, fontWeight: metric === m ? 600 : 400,
            background: metric === m ? 'rgba(255,255,255,0.12)' : 'transparent',
            border: '1px solid', borderColor: metric === m ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
            borderRadius: 4, color: metric === m ? '#fff' : '#888', cursor: 'pointer',
            textTransform: 'uppercase', letterSpacing: 0.5, transition: 'all 0.2s',
          }}>
            {m}
          </button>
        ))}
      </div>
      <HorizontalBarChart data={barData} />
    </div>
  );
}

interface InfraStatusChartProps {
  data: InfraTypeSummary[];
}

export function InfraStatusChart({ data }: InfraStatusChartProps) {
  const grouped: Record<string, Record<string, number>> = {};
  for (const d of data) {
    if (!grouped[d.infra_type]) grouped[d.infra_type] = {};
    grouped[d.infra_type][d.status] = d.cnt;
  }

  const types = Object.keys(grouped).filter(t => t !== 'pipeline').sort((a, b) => {
    const totalA = Object.values(grouped[a]).reduce((s, v) => s + v, 0);
    const totalB = Object.values(grouped[b]).reduce((s, v) => s + v, 0);
    return totalB - totalA;
  });

  const maxTotal = Math.max(...types.map(t => Object.values(grouped[t]).reduce((s, v) => s + v, 0)), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {types.map(type => {
        const counts = grouped[type];
        const total = Object.values(counts).reduce((s, v) => s + v, 0);
        const widthPct = (total / maxTotal) * 100;
        return (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 80, fontSize: 10, color: '#ccc', textAlign: 'right',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {INFRA_LABELS[type] || type}
            </span>
            <div style={{
              flex: 1, height: 20, background: 'rgba(255,255,255,0.05)',
              borderRadius: 4, overflow: 'hidden', display: 'flex',
            }}>
              {['intact', 'damaged', 'destroyed'].map(status => {
                const val = counts[status] || 0;
                if (val === 0) return null;
                const segPct = (val / total) * widthPct;
                return (
                  <div key={status} title={`${status}: ${val}`} style={{
                    width: `${Math.max(segPct, 1)}%`,
                    height: '100%',
                    background: STATUS_COLORS[status],
                    opacity: 0.85,
                    transition: 'width 0.8s ease-out',
                  }} />
                );
              })}
            </div>
            <span style={{ fontSize: 10, color: '#888', width: 24, textAlign: 'right', flexShrink: 0 }}>
              {total}
            </span>
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 12, marginTop: 6, justifyContent: 'center' }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 9, color: '#999', textTransform: 'capitalize' }}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TimelineChartProps {
  data: TimelinePoint[];
}

export function StrikeTimelineChart({ data }: TimelineChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0) return <div style={{ color: '#666', fontSize: 11 }}>No timeline data available</div>;

  const maxCount = Math.max(...data.map(d => d.strike_count), 1);
  const chartH = 120;
  const barW = Math.max(Math.min(Math.floor(500 / data.length) - 2, 16), 4);

  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 2, height: chartH,
        padding: '0 4px', overflowX: 'auto',
      }}>
        {data.map((d, i) => {
          const h = Math.max((d.strike_count / maxCount) * (chartH - 20), 2);
          const isHovered = hoveredIdx === i;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {isHovered && (
                <div style={{
                  position: 'absolute', bottom: h + 8, left: '50%', transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 4, padding: '4px 8px', whiteSpace: 'nowrap', zIndex: 10,
                }}>
                  <div style={{ fontSize: 9, color: '#ccc' }}>{new Date(d.strike_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  <div style={{ fontSize: 10, color: '#ff1744', fontWeight: 600 }}>{d.strike_count} strikes</div>
                  <div style={{ fontSize: 9, color: '#ff9800' }}>{d.projectile_count} projectiles</div>
                </div>
              )}
              <div style={{
                width: barW, height: h,
                background: isHovered
                  ? 'linear-gradient(180deg, #ff1744, #ff174488)'
                  : 'linear-gradient(180deg, #ff174488, #ff174433)',
                borderRadius: '2px 2px 0 0',
                transition: 'height 0.5s ease-out, background 0.2s',
                cursor: 'pointer',
              }} />
            </div>
          );
        })}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', marginTop: 4, padding: '0 4px',
      }}>
        {data.length > 0 && (
          <>
            <span style={{ fontSize: 9, color: '#666' }}>
              {new Date(data[0].strike_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <span style={{ fontSize: 9, color: '#666' }}>
              {new Date(data[data.length - 1].strike_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

interface NavalOrbatProps {
  assets: NavalAssetSummary[];
}

export function NavalOrbatChart({ assets }: NavalOrbatProps) {
  const byOperator: Record<string, NavalAssetSummary[]> = {};
  for (const a of assets) {
    if (!byOperator[a.operator]) byOperator[a.operator] = [];
    byOperator[a.operator].push(a);
  }

  const OPERATOR_COLORS: Record<string, string> = {
    'US Navy': '#4caf50',
    'Royal Navy': '#00bcd4',
    'French Navy': '#0097a7',
    'Iranian Navy': '#f44336',
    'IRGC Navy': '#e53935',
  };

  const typeIcons: Record<string, string> = {
    carrier: 'CV',
    cruiser: 'CG',
    destroyer: 'DDG',
    frigate: 'FFG',
    submarine: 'SSN',
    amphibious: 'LH',
    patrol: 'PC',
    support: 'T-',
  };

  const sorted = Object.entries(byOperator).sort((a, b) => b[1].length - a[1].length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {sorted.map(([operator, ships]) => {
        const color = OPERATOR_COLORS[operator] || '#78909c';
        return (
          <div key={operator}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#ddd', letterSpacing: 0.3 }}>
                {operator}
              </span>
              <span style={{ fontSize: 10, color: '#888' }}>({ships.length})</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 12 }}>
              {ships.map(ship => (
                <div key={ship.name} title={`${ship.name} (${ship.hull_number}) - ${ship.class_name}\n${ship.region}\n${ship.status}`} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 4,
                  background: `${color}15`, border: `1px solid ${color}30`,
                  cursor: 'default', transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color, fontFamily: 'monospace' }}>
                    {typeIcons[ship.asset_type] || '?'}
                  </span>
                  <span style={{ fontSize: 9, color: '#ccc' }}>{ship.name.replace(/^(USS |HMS |FS |IRIS |IRGCN )/, '')}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ForceCompositionProps {
  navalByOperator: Record<string, { count: number; types: Record<string, number> }>;
  basesByOperator: Record<string, number>;
}

export function ForceCompositionChart({ navalByOperator, basesByOperator }: ForceCompositionProps) {
  const allOps = new Set([...Object.keys(navalByOperator), ...Object.keys(basesByOperator)]);
  const combined = Array.from(allOps).map(op => ({
    operator: op,
    vessels: navalByOperator[op]?.count || 0,
    bases: basesByOperator[op] || 0,
    total: (navalByOperator[op]?.count || 0) + (basesByOperator[op] || 0),
  })).sort((a, b) => b.total - a.total).slice(0, 8);

  const maxTotal = Math.max(...combined.map(c => c.total), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {combined.map(c => (
        <div key={c.operator} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 56, fontSize: 10, color: '#ccc', textAlign: 'right',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {c.operator}
          </span>
          <div style={{
            flex: 1, height: 18, background: 'rgba(255,255,255,0.05)',
            borderRadius: 4, overflow: 'hidden', display: 'flex',
          }}>
            {c.bases > 0 && (
              <div style={{
                width: `${(c.bases / maxTotal) * 100}%`,
                height: '100%', background: '#2196f388',
                transition: 'width 0.8s ease-out',
              }} title={`${c.bases} bases`} />
            )}
            {c.vessels > 0 && (
              <div style={{
                width: `${(c.vessels / maxTotal) * 100}%`,
                height: '100%', background: '#00bcd488',
                transition: 'width 0.8s ease-out',
              }} title={`${c.vessels} vessels`} />
            )}
          </div>
          <span style={{ fontSize: 10, color: '#888', width: 24, textAlign: 'right', flexShrink: 0 }}>
            {c.total}
          </span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 12, marginTop: 4, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#2196f3' }} />
          <span style={{ fontSize: 9, color: '#999' }}>Bases</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: '#00bcd4' }} />
          <span style={{ fontSize: 9, color: '#999' }}>Vessels</span>
        </div>
      </div>
    </div>
  );
}
