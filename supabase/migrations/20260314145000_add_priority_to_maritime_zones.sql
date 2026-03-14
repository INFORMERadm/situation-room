/*
  # Add priority column to maritime_zones

  1. Modified Tables
    - `maritime_zones`
      - Added `priority` (integer, default 2)
        - 1 = HIGH priority -- queried every polling cycle
        - 2 = NORMAL priority -- rotated one at a time per cycle

  2. Priority Assignments
    - HIGH (1): Strait of Hormuz, Persian Gulf, Red Sea, Eastern Mediterranean (Israel)
    - NORMAL (2): Bab el-Mandeb, Gulf of Aden, Suez Canal, Arabian Sea - Western

  3. Notes
    - Drives the zone rotation logic in the maritime-tracker edge function
    - Lower number = higher priority
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'maritime_zones' AND column_name = 'priority'
  ) THEN
    ALTER TABLE maritime_zones ADD COLUMN priority integer NOT NULL DEFAULT 2;
  END IF;
END $$;

UPDATE maritime_zones SET priority = 1
WHERE zone_name IN ('Strait of Hormuz', 'Persian Gulf', 'Red Sea', 'Eastern Mediterranean');

UPDATE maritime_zones SET priority = 2
WHERE zone_name IN ('Bab el-Mandeb', 'Gulf of Aden', 'Suez Canal', 'Arabian Sea - Western');
