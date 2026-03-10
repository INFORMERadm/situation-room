import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { StrikeEvent } from '../../types';
import { getWeaponProfile } from '../../lib/strikeConstants';

interface Props {
  events: StrikeEvent[];
}

interface ArcPoint {
  lat: number;
  lng: number;
}

function generateArcPath(
  srcLat: number,
  srcLng: number,
  tgtLat: number,
  tgtLng: number,
  arcHeight: number,
  segments: number,
): ArcPoint[] {
  const points: ArcPoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = srcLat + (tgtLat - srcLat) * t;
    const lng = srcLng + (tgtLng - srcLng) * t;

    const dist = Math.sqrt((tgtLat - srcLat) ** 2 + (tgtLng - srcLng) ** 2);
    const elevation = arcHeight * dist * Math.sin(Math.PI * t);

    const perpLat = -(tgtLng - srcLng);
    const perpLng = tgtLat - srcLat;
    const perpLen = Math.sqrt(perpLat ** 2 + perpLng ** 2) || 1;

    points.push({
      lat: lat + (perpLat / perpLen) * elevation * 0.3 + elevation * 0.7,
      lng: lng,
    });
  }
  return points;
}

interface EventAnimation {
  eventId: string;
  sourceMarker: L.CircleMarker;
  targetMarker: L.CircleMarker;
  targetPulse: L.CircleMarker;
  trailLines: L.Polyline[];
  projectileMarkers: L.CircleMarker[];
  impactMarkers: L.CircleMarker[];
  arcPath: ArcPoint[];
  flightTimeSec: number;
  startTime: number;
  projectileCount: number;
  staggerSec: number;
  completed: boolean;
}

export default function StrikeAnimationOverlay({ events }: Props) {
  const map = useMap();
  const animationsRef = useRef<Map<string, EventAnimation>>(new Map());
  const rafRef = useRef<number>(0);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const cleanupAnimation = useCallback((anim: EventAnimation) => {
    anim.sourceMarker.remove();
    anim.targetMarker.remove();
    anim.targetPulse.remove();
    anim.trailLines.forEach((l) => l.remove());
    anim.projectileMarkers.forEach((m) => m.remove());
    anim.impactMarkers.forEach((m) => m.remove());
  }, []);

  const createAnimation = useCallback(
    (event: StrikeEvent): EventAnimation => {
      const profile = getWeaponProfile(event.event_type);
      const arcPath = generateArcPath(
        event.source_lat,
        event.source_lng,
        event.target_lat,
        event.target_lng,
        profile.arc_height,
        100,
      );

      const sourceMarker = L.circleMarker(
        [event.source_lat, event.source_lng],
        {
          radius: 8,
          color: profile.color,
          fillColor: profile.color,
          fillOpacity: 0.7,
          weight: 2,
          className: 'strike-source-marker',
        },
      ).addTo(map);

      sourceMarker.bindTooltip(
        `<div style="padding:4px 8px;font-size:11px"><strong style="color:${profile.color}">${profile.label}</strong><br/><span style="color:#ccc">${event.source_label} → ${event.target_label}</span></div>`,
        { direction: 'top', offset: [0, -12], opacity: 1, className: 'flight-marker-tooltip' },
      );

      const targetMarker = L.circleMarker(
        [event.target_lat, event.target_lng],
        {
          radius: 6,
          color: '#ff1744',
          fillColor: '#ff1744',
          fillOpacity: 0.5,
          weight: 2,
        },
      ).addTo(map);

      const targetPulse = L.circleMarker(
        [event.target_lat, event.target_lng],
        {
          radius: 12,
          color: '#ff1744',
          fillColor: 'transparent',
          fillOpacity: 0,
          weight: 1.5,
          opacity: 0.6,
        },
      ).addTo(map);

      const projectileMarkers: L.CircleMarker[] = [];
      const count = Math.min(event.projectile_count, 12);
      for (let i = 0; i < count; i++) {
        const marker = L.circleMarker(
          [event.source_lat, event.source_lng],
          {
            radius: profile.markerSize,
            color: profile.color,
            fillColor: '#fff',
            fillOpacity: 0.9,
            weight: 2,
            opacity: 0,
          },
        ).addTo(map);
        projectileMarkers.push(marker);
      }

      const elapsed = (Date.now() - new Date(event.detected_at).getTime()) / 1000;

      return {
        eventId: event.id,
        sourceMarker,
        targetMarker,
        targetPulse,
        trailLines: [],
        projectileMarkers,
        impactMarkers: [],
        arcPath,
        flightTimeSec: event.estimated_flight_time_seconds,
        startTime: performance.now() - elapsed * 1000,
        projectileCount: count,
        staggerSec: Math.min(2, event.estimated_flight_time_seconds * 0.05),
        completed: false,
      };
    },
    [map],
  );

  const tick = useCallback(() => {
    const now = performance.now();
    const animations = animationsRef.current;

    for (const [id, anim] of animations) {
      if (anim.completed) continue;

      const elapsedSec = (now - anim.startTime) / 1000;
      const totalDuration = anim.flightTimeSec + anim.staggerSec * anim.projectileCount;

      if (elapsedSec > totalDuration + 10) {
        anim.completed = true;
        continue;
      }

      const pulsePhase = (elapsedSec % 2) / 2;
      const pulseRadius = 12 + pulsePhase * 20;
      const pulseOpacity = 0.6 * (1 - pulsePhase);
      anim.targetPulse.setRadius(pulseRadius);
      anim.targetPulse.setStyle({ opacity: pulseOpacity });

      const sourcePhase = (elapsedSec % 1.5) / 1.5;
      const sourceOpacity = elapsedSec < anim.flightTimeSec ? 0.3 + 0.4 * Math.sin(sourcePhase * Math.PI) : 0.1;
      anim.sourceMarker.setStyle({ fillOpacity: sourceOpacity });

      for (let i = 0; i < anim.projectileCount; i++) {
        const projectileStart = i * anim.staggerSec;
        const projectileElapsed = elapsedSec - projectileStart;
        const progress = Math.max(0, Math.min(1, projectileElapsed / anim.flightTimeSec));

        const marker = anim.projectileMarkers[i];
        if (projectileElapsed < 0) {
          marker.setStyle({ opacity: 0, fillOpacity: 0 });
          continue;
        }

        if (progress >= 1) {
          marker.setStyle({ opacity: 0, fillOpacity: 0 });

          if (!anim.impactMarkers[i]) {
            const path = anim.arcPath;
            const target = path[path.length - 1];
            const impact = L.circleMarker([target.lat, target.lng], {
              radius: 10,
              color: '#ff1744',
              fillColor: '#ff1744',
              fillOpacity: 0.6,
              weight: 2,
            }).addTo(map);
            anim.impactMarkers[i] = impact;
          }

          const impactAge = projectileElapsed - anim.flightTimeSec;
          const impactMarker = anim.impactMarkers[i];
          if (impactMarker && impactAge < 5) {
            const impactRadius = 10 + impactAge * 8;
            const impactOpacity = Math.max(0, 0.6 - impactAge * 0.12);
            impactMarker.setRadius(impactRadius);
            impactMarker.setStyle({ fillOpacity: impactOpacity, opacity: impactOpacity });
          } else if (impactMarker) {
            impactMarker.setStyle({ opacity: 0, fillOpacity: 0 });
          }
          continue;
        }

        const pathIndex = Math.floor(progress * (anim.arcPath.length - 1));
        const point = anim.arcPath[pathIndex];
        marker.setLatLng([point.lat, point.lng]);
        marker.setStyle({ opacity: 1, fillOpacity: 0.9 });

        const trailKey = i;
        if (!anim.trailLines[trailKey]) {
          const profile = getWeaponProfile(
            eventsRef.current.find((e) => e.id === id)?.event_type || 'rocket',
          );
          const trail = L.polyline([], {
            color: profile.trailColor,
            weight: 2,
            opacity: 0.6,
            dashArray: '4 4',
          }).addTo(map);
          anim.trailLines[trailKey] = trail;
        }

        const trailStartIdx = Math.max(0, pathIndex - 20);
        const trailPoints = anim.arcPath
          .slice(trailStartIdx, pathIndex + 1)
          .map((p) => [p.lat, p.lng] as [number, number]);
        anim.trailLines[trailKey].setLatLngs(trailPoints);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [map]);

  useEffect(() => {
    const animations = animationsRef.current;
    const currentIds = new Set(events.map((e) => e.id));

    for (const [id, anim] of animations) {
      if (!currentIds.has(id)) {
        cleanupAnimation(anim);
        animations.delete(id);
      }
    }

    for (const event of events) {
      if (!animations.has(event.id)) {
        animations.set(event.id, createAnimation(event));
      }
    }
  }, [events, createAnimation, cleanupAnimation]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      for (const [, anim] of animationsRef.current) {
        cleanupAnimation(anim);
      }
      animationsRef.current.clear();
    };
  }, [cleanupAnimation]);

  return null;
}
