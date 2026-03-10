export type StrikeEventType =
  | 'ballistic_missile'
  | 'cruise_missile'
  | 'rocket'
  | 'drone'
  | 'air_strike'
  | 'artillery';

export interface WeaponProfile {
  label: string;
  speed_kmh: number;
  arc_height: number;
  color: string;
  trailColor: string;
  glowColor: string;
  markerSize: number;
  icon: string;
}

export const WEAPON_PROFILES: Record<StrikeEventType, WeaponProfile> = {
  ballistic_missile: {
    label: 'Ballistic Missile',
    speed_kmh: 7000,
    arc_height: 0.4,
    color: '#ff3d00',
    trailColor: 'rgba(255, 61, 0, 0.4)',
    glowColor: 'rgba(255, 61, 0, 0.6)',
    markerSize: 6,
    icon: '\u{1F3AF}',
  },
  cruise_missile: {
    label: 'Cruise Missile',
    speed_kmh: 900,
    arc_height: 0.05,
    color: '#ff9100',
    trailColor: 'rgba(255, 145, 0, 0.4)',
    glowColor: 'rgba(255, 145, 0, 0.6)',
    markerSize: 5,
    icon: '\u{1F680}',
  },
  rocket: {
    label: 'Rocket',
    speed_kmh: 1800,
    arc_height: 0.15,
    color: '#ff6d00',
    trailColor: 'rgba(255, 109, 0, 0.4)',
    glowColor: 'rgba(255, 109, 0, 0.6)',
    markerSize: 4,
    icon: '\u{1F4A5}',
  },
  drone: {
    label: 'Drone / UAV',
    speed_kmh: 185,
    arc_height: 0.02,
    color: '#d50000',
    trailColor: 'rgba(213, 0, 0, 0.3)',
    glowColor: 'rgba(213, 0, 0, 0.5)',
    markerSize: 5,
    icon: '\u{2708}',
  },
  air_strike: {
    label: 'Air Strike',
    speed_kmh: 2200,
    arc_height: 0.08,
    color: '#ffab00',
    trailColor: 'rgba(255, 171, 0, 0.4)',
    glowColor: 'rgba(255, 171, 0, 0.6)',
    markerSize: 5,
    icon: '\u{2622}',
  },
  artillery: {
    label: 'Artillery',
    speed_kmh: 2500,
    arc_height: 0.2,
    color: '#ff3d00',
    trailColor: 'rgba(255, 61, 0, 0.3)',
    glowColor: 'rgba(255, 61, 0, 0.5)',
    markerSize: 3,
    icon: '\u{1F4A3}',
  },
};

export function getWeaponProfile(eventType: string): WeaponProfile {
  return WEAPON_PROFILES[eventType as StrikeEventType] || WEAPON_PROFILES.rocket;
}
