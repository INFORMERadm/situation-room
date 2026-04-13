import { useState } from 'react';
import type { StrikeCountrySummary, InfraTypeSummary, TimelinePoint, NavalAssetSummary } from '../../hooks/useWarDashboard';

const GREY_SHADES = [
  'rgba(255,255,255,0.45)',
  'rgba(255,255,255,0.35)',
  'rgba(255,255,255,0.25)',
  'rgba(255,255,255,0.18)',
  'rgba(255,255,255,0.13)',
  'rgba(255,255,255,0.10)',
  'rgba(255,255,255,0.08)',
  'rgba(255,255,255,0.06)',
];

function getGreyShade(index: number): string {
  return GREY_SHADES[index % GREY_SHADES.length];
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

const STATUS_SHADES: Record<string, string> = {
  intact: 'rgba(255,255,255,0.25)',
  damaged: 'rgba(255,255,255,0.12)',
  destroyed: 'rgba(255,255,255,0.05)',
};

interface BarChartProps {
  data: { label: string; value: number; color: string }[];
  maxValue?: number;
  height?: number;
  showValues?: boolean;
}

function HorizontalBarChart({ data, maxValue, height = 22, showValues = true }: BarChartProps) {
  const max = maxValue || Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 80, fontSize: 10, color: '#aaa', textAlign: 'right',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {d.label}
          </span>
          <div style={{
            flex: 1, height, background: 'rgba(255,255,255,0.04)',
            borderRadius: 3, overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              width: `${Math.max((d.value / max) * 100, 2)}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${d.color}, ${d.color.replace(')', ', 0.4)').replace('rgba', 'rgba')})`,
              borderRadius: 3,
              transition: 'width 0.8s ease-out',
            }} />
            {showValues && (
              <span style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                fontSize: 10, color: '#ccc', fontWeight: 600,
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                fontVariantNumeric: 'tabular-nums',
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

  const barData = top.map((d, i) => ({
    label: d.source_country,
    value: metric === 'strikes' ? d.total_strikes : d.total_projectiles,
    color: getGreyShade(i),
  }));

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {(['strikes', 'projectiles'] as const).map(m => (
          <button key={m} onClick={() => setMetric(m)} style={{
            padding: '3px 10px', fontSize: 10, fontWeight: metric === m ? 600 : 400,
            background: metric === m ? 'rgba(255,255,255,0.08)' : 'transparent',
            border: '1px solid', borderColor: metric === m ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
            borderRadius: 4, color: metric === m ? '#ddd' : '#666', cursor: 'pointer',
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
              width: 80, fontSize: 10, color: '#aaa', textAlign: 'right',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {INFRA_LABELS[type] || type}
            </span>
            <div style={{
              flex: 1, height: 18, background: 'rgba(255,255,255,0.04)',
              borderRadius: 3, overflow: 'hidden', display: 'flex',
            }}>
              {['intact', 'damaged', 'destroyed'].map(status => {
                const val = counts[status] || 0;
                if (val === 0) return null;
                const segPct = (val / total) * widthPct;
                return (
                  <div key={status} title={`${status}: ${val}`} style={{
                    width: `${Math.max(segPct, 1)}%`,
                    height: '100%',
                    background: STATUS_SHADES[status],
                    transition: 'width 0.8s ease-out',
                  }} />
                );
              })}
            </div>
            <span style={{ fontSize: 10, color: '#777', width: 24, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {total}
            </span>
          </div>
        );
      })}
      <div style={{ display: 'flex', gap: 12, marginTop: 6, justifyContent: 'center' }}>
        {Object.entries(STATUS_SHADES).map(([status, shade]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: shade }} />
            <span style={{ fontSize: 9, color: '#777', textTransform: 'capitalize' }}>{status}</span>
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

  if (data.length === 0) return <div style={{ color: '#555', fontSize: 10 }}>No timeline data available</div>;

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
                  background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 4, padding: '4px 8px', whiteSpace: 'nowrap', zIndex: 10,
                }}>
                  <div style={{ fontSize: 9, color: '#aaa' }}>{new Date(d.strike_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                  <div style={{ fontSize: 10, color: '#e0e0e0', fontWeight: 600 }}>{d.strike_count} strikes</div>
                  <div style={{ fontSize: 9, color: '#999' }}>{d.projectile_count} projectiles</div>
                </div>
              )}
              <div style={{
                width: barW, height: h,
                background: isHovered
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0.15))'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.06))',
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
            <span style={{ fontSize: 9, color: '#555' }}>
              {new Date(data[0].strike_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <span style={{ fontSize: 9, color: '#555' }}>
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
      {sorted.map(([operator, ships], idx) => {
        const shade = getGreyShade(idx);
        return (
          <div key={operator}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: shade }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#ccc', letterSpacing: 0.3 }}>
                {operator}
              </span>
              <span style={{ fontSize: 10, color: '#666' }}>({ships.length})</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingLeft: 12 }}>
              {ships.map(ship => (
                <div key={ship.name} title={`${ship.name} (${ship.hull_number}) - ${ship.class_name}\n${ship.region}\n${ship.status}`} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 3,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  cursor: 'default', transition: 'all 0.2s',
                }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#999', fontFamily: 'monospace' }}>
                    {typeIcons[ship.asset_type] || '?'}
                  </span>
                  <span style={{ fontSize: 9, color: '#bbb' }}>{ship.name.replace(/^(USS |HMS |FS |IRIS |IRGCN )/, '')}</span>
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
            width: 56, fontSize: 10, color: '#aaa', textAlign: 'right',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {c.operator}
          </span>
          <div style={{
            flex: 1, height: 18, background: 'rgba(255,255,255,0.04)',
            borderRadius: 3, overflow: 'hidden', display: 'flex',
          }}>
            {c.bases > 0 && (
              <div style={{
                width: `${(c.bases / maxTotal) * 100}%`,
                height: '100%', background: 'rgba(255,255,255,0.18)',
                transition: 'width 0.8s ease-out',
              }} title={`${c.bases} bases`} />
            )}
            {c.vessels > 0 && (
              <div style={{
                width: `${(c.vessels / maxTotal) * 100}%`,
                height: '100%', background: 'rgba(255,255,255,0.08)',
                transition: 'width 0.8s ease-out',
              }} title={`${c.vessels} vessels`} />
            )}
          </div>
          <span style={{ fontSize: 10, color: '#777', width: 24, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
            {c.total}
          </span>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 12, marginTop: 4, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
          <span style={{ fontSize: 9, color: '#777' }}>Bases</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: 9, color: '#777' }}>Vessels</span>
        </div>
      </div>
    </div>
  );
}
