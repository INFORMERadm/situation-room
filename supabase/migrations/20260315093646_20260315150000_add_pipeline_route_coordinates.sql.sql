/*
  # Add Route Coordinates to Critical Infrastructure

  ## Purpose
  Adds a `route_coordinates` JSONB column to store geographic polyline data
  for pipelines and other linear infrastructure (undersea cables, highways).
  This allows pipelines to be rendered as actual lines on the map rather than
  single point markers.

  ## Changes
  - New column `route_coordinates` (JSONB, nullable) on `critical_infrastructure`
    - Stores an array of [latitude, longitude] pairs: [[lat, lng], [lat, lng], ...]
    - NULL for point-based infrastructure (airports, ports, etc.)
    - Populated for pipelines, undersea cables, highway routes

  ## Notes
  1. Column is nullable so existing point-based markers continue working unchanged
  2. When route_coordinates is present, the map renders a polyline; otherwise a marker
  3. A midpoint marker is still shown on the line for the popup/tooltip
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'critical_infrastructure' AND column_name = 'route_coordinates'
  ) THEN
    ALTER TABLE critical_infrastructure ADD COLUMN route_coordinates JSONB;
  END IF;
END $$;
