import { useState, useEffect, useRef } from 'react';
import type { VesselPosition } from '../types';

const VESSEL_STALE_MS = 300_000;
const FLUSH_INTERVAL = 2_000;
const RECONNECT_DELAY = 5_000;
const WS_URL = 'wss://stream.aisstream.io/v0/stream';

function getShipTypeName(typeCode: number): string {
  if (typeCode >= 70 && typeCode <= 79) return 'cargo';
  if (typeCode >= 80 && typeCode <= 89) return 'tanker';
  if (typeCode >= 60 && typeCode <= 69) return 'passenger';
  if (typeCode >= 40 && typeCode <= 49) return 'high_speed';
  if (typeCode >= 30 && typeCode <= 39) return 'fishing';
  if (typeCode >= 50 && typeCode <= 59) return 'special';
  if (typeCode >= 20 && typeCode <= 29) return 'wing_in_ground';
  return 'other';
}

interface AisPositionReport {
  Latitude: number;
  Longitude: number;
  Cog: number;
  Sog: number;
  TrueHeading: number;
}

interface AisMessage {
  MetaData?: {
    MMSI: number;
    ShipName?: string;
  };
  Message?: {
    PositionReport?: AisPositionReport;
    StandardClassBPositionReport?: AisPositionReport;
    ShipStaticData?: {
      Name: string;
      Type: number;
      Destination: string;
    };
  };
}

interface StreamConfig {
  apiKey: string;
  boundingBoxes: number[][][];
}

async function fetchStreamConfig(): Promise<StreamConfig> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maritime-tracker?feed=stream-config`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Config fetch failed: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return { apiKey: data.apiKey, boundingBoxes: data.boundingBoxes };
}

export function useCommercialShipping(active: boolean) {
  const [vessels, setVessels] = useState<VesselPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vesselMapRef = useRef<Map<number, VesselPosition>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const configRef = useRef<StreamConfig | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const flushRef = useRef<ReturnType<typeof setInterval>>();
  const dirtyRef = useRef(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!active) {
      cancelledRef.current = true;
      teardown();
      return;
    }

    cancelledRef.current = false;
    startConnection();

    return () => {
      cancelledRef.current = true;
      teardown();
    };
  }, [active]);

  function teardown() {
    clearTimeout(reconnectRef.current);
    clearInterval(flushRef.current);
    const ws = wsRef.current;
    if (ws) {
      wsRef.current = null;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      try { ws.close(); } catch { /* noop */ }
    }
  }

  async function startConnection() {
    if (cancelledRef.current) return;
    setLoading(true);
    setError(null);

    try {
      if (!configRef.current) {
        configRef.current = await fetchStreamConfig();
      }
      if (cancelledRef.current) return;
      connectWs();
    } catch (err) {
      if (cancelledRef.current) return;
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      reconnectRef.current = setTimeout(() => {
        if (!cancelledRef.current) startConnection();
      }, RECONNECT_DELAY);
    }
  }

  function connectWs() {
    if (cancelledRef.current || !configRef.current) return;
    teardown();

    const config = configRef.current;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (cancelledRef.current) { ws.close(); return; }
      setLoading(false);
      setError(null);

      ws.send(JSON.stringify({
        APIKey: config.apiKey,
        BoundingBoxes: config.boundingBoxes,
        FilterMessageTypes: [
          'PositionReport',
          'ShipStaticData',
          'StandardClassBPositionReport',
        ],
      }));

      clearInterval(flushRef.current);
      flushRef.current = setInterval(() => {
        if (!dirtyRef.current) return;
        dirtyRef.current = false;
        const now = Date.now();
        const map = vesselMapRef.current;
        for (const [mmsi, v] of map) {
          if (now - v.timestamp > VESSEL_STALE_MS) map.delete(mmsi);
        }
        setVessels(Array.from(map.values()));
      }, FLUSH_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const raw = typeof event.data === 'string' ? event.data : '';
        if (!raw) return;
        const msg: AisMessage = JSON.parse(raw);
        const mmsi = msg.MetaData?.MMSI;
        if (!mmsi) return;

        const map = vesselMapRef.current;
        const existing = map.get(mmsi);

        const posReport = msg.Message?.PositionReport || msg.Message?.StandardClassBPositionReport;
        if (posReport) {
          map.set(mmsi, {
            mmsi,
            name: msg.MetaData?.ShipName?.trim() || existing?.name || '',
            shipType: existing?.shipType || 'other',
            shipTypeCode: existing?.shipTypeCode || 0,
            latitude: posReport.Latitude,
            longitude: posReport.Longitude,
            courseOverGround: posReport.Cog,
            speedOverGround: posReport.Sog,
            heading: posReport.TrueHeading === 511 ? posReport.Cog : posReport.TrueHeading,
            destination: existing?.destination || '',
            timestamp: Date.now(),
          });
          dirtyRef.current = true;
        } else if (msg.Message?.ShipStaticData && existing) {
          const sd = msg.Message.ShipStaticData;
          existing.name = sd.Name?.trim() || existing.name;
          existing.shipType = getShipTypeName(sd.Type);
          existing.shipTypeCode = sd.Type;
          existing.destination = sd.Destination?.trim() || existing.destination;
          dirtyRef.current = true;
        }
      } catch { /* skip malformed */ }
    };

    ws.onerror = () => {
      if (cancelledRef.current) return;
      setError('AIS stream connection error');
      setLoading(false);
    };

    ws.onclose = () => {
      if (cancelledRef.current) return;
      clearInterval(flushRef.current);
      setLoading(false);
      reconnectRef.current = setTimeout(() => {
        if (!cancelledRef.current) startConnection();
      }, RECONNECT_DELAY);
    };
  }

  return { vessels, vesselCount: vessels.length, loading, error };
}
