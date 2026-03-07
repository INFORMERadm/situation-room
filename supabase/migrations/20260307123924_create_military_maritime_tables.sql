/*
  # Military & Maritime Tracking Tables

  1. New Tables
    - `military_bases`
      - `id` (uuid, primary key)
      - `name` (text) - Installation name
      - `country` (text) - Host country
      - `operator` (text) - Operating nation/force
      - `base_type` (text) - Type: air_base, naval_base, missile_defense, radar, command_center, mixed
      - `latitude` (double precision) - Geographic latitude
      - `longitude` (double precision) - Geographic longitude
      - `description` (text) - Brief description
      - `equipment` (jsonb) - Array of equipment objects with type, category, quantity
      - `is_active` (boolean) - Whether currently active
      - `source_url` (text) - Public source reference
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `military_naval_assets`
      - `id` (uuid, primary key)
      - `name` (text) - Vessel name
      - `asset_type` (text) - carrier, destroyer, cruiser, frigate, submarine, amphibious, support, patrol
      - `operator` (text) - Operating navy
      - `hull_number` (text) - Hull designation
      - `class_name` (text) - Ship class
      - `latitude` (double precision) - Last known latitude
      - `longitude` (double precision) - Last known longitude
      - `heading` (double precision) - Last known heading
      - `region` (text) - Operating region
      - `status` (text) - Deployment status
      - `last_reported_date` (text) - Date of last known position report
      - `source_description` (text) - Source of position data
      - `source_url` (text) - Public source reference
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `maritime_zones`
      - `id` (uuid, primary key)
      - `zone_name` (text) - Display name
      - `description` (text) - Zone description
      - `bbox_south` (double precision) - Southern boundary
      - `bbox_west` (double precision) - Western boundary
      - `bbox_north` (double precision) - Northern boundary
      - `bbox_east` (double precision) - Eastern boundary
      - `is_active` (boolean) - Whether to subscribe to AIS data in this zone
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Authenticated users can read all data
    - Only service role can write/update (data managed by admin/system)

  3. Seed Data
    - Military bases across Middle East theater (US, Israel, Iran, Russia, UK, France, regional)
    - Naval assets with last known positions
    - Maritime zones covering key waterways
*/

-- Military Bases Table
CREATE TABLE IF NOT EXISTS military_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL DEFAULT '',
  operator text NOT NULL DEFAULT '',
  base_type text NOT NULL DEFAULT 'air_base',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  description text NOT NULL DEFAULT '',
  equipment jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  source_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT military_bases_type_check CHECK (
    base_type = ANY (ARRAY['air_base', 'naval_base', 'missile_defense', 'radar', 'command_center', 'mixed'])
  )
);

ALTER TABLE military_bases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read military bases"
  ON military_bases FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Military Naval Assets Table
CREATE TABLE IF NOT EXISTS military_naval_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  asset_type text NOT NULL DEFAULT 'destroyer',
  operator text NOT NULL DEFAULT '',
  hull_number text NOT NULL DEFAULT '',
  class_name text NOT NULL DEFAULT '',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  heading double precision NOT NULL DEFAULT 0,
  region text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'deployed',
  last_reported_date text NOT NULL DEFAULT '',
  source_description text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT naval_asset_type_check CHECK (
    asset_type = ANY (ARRAY['carrier', 'destroyer', 'cruiser', 'frigate', 'submarine', 'amphibious', 'support', 'patrol', 'corvette'])
  )
);

ALTER TABLE military_naval_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read naval assets"
  ON military_naval_assets FOR SELECT
  TO authenticated
  USING (true);

-- Maritime Zones Table
CREATE TABLE IF NOT EXISTS maritime_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  bbox_south double precision NOT NULL,
  bbox_west double precision NOT NULL,
  bbox_north double precision NOT NULL,
  bbox_east double precision NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE maritime_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read maritime zones"
  ON maritime_zones FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ========================================
-- SEED: Military Bases
-- ========================================

-- US CENTCOM Installations
INSERT INTO military_bases (name, country, operator, base_type, latitude, longitude, description, equipment) VALUES
('Al Udeid Air Base', 'Qatar', 'US Air Force', 'air_base', 25.1174, 51.3150, 'CENTCOM forward HQ and Combined Air Operations Center. Largest US air base in the Middle East.', '[{"type": "F-15E Strike Eagle", "category": "fighter", "quantity": 24}, {"type": "KC-135 Stratotanker", "category": "tanker", "quantity": 12}, {"type": "B-52H Stratofortress", "category": "bomber", "quantity": 6}, {"type": "E-8C JSTARS", "category": "isr", "quantity": 2}, {"type": "RQ-4 Global Hawk", "category": "uav", "quantity": 4}]'),
('Al Dhafra Air Base', 'UAE', 'US Air Force', 'air_base', 24.2481, 54.5472, 'Key USAF base hosting stealth fighters and ISR platforms.', '[{"type": "F-35A Lightning II", "category": "fighter", "quantity": 12}, {"type": "F-22 Raptor", "category": "fighter", "quantity": 12}, {"type": "KC-10 Extender", "category": "tanker", "quantity": 6}, {"type": "U-2 Dragon Lady", "category": "isr", "quantity": 3}, {"type": "RQ-4 Global Hawk", "category": "uav", "quantity": 2}]'),
('Muwaffaq Salti Air Base', 'Jordan', 'US Air Force', 'air_base', 32.3564, 36.7822, 'Joint US-Jordanian base supporting operations in Syria/Iraq theater.', '[{"type": "F-16 Fighting Falcon", "category": "fighter", "quantity": 12}, {"type": "MQ-9 Reaper", "category": "uav", "quantity": 8}]'),
('NSA Bahrain', 'Bahrain', 'US Navy', 'naval_base', 26.2361, 50.6153, 'Headquarters of US Naval Forces Central Command (NAVCENT) and US Fifth Fleet.', '[{"type": "Patrol Coastal ships", "category": "patrol", "quantity": 10}, {"type": "Mine countermeasure ships", "category": "mine_warfare", "quantity": 4}]'),
('Camp Arifjan', 'Kuwait', 'US Army', 'command_center', 28.9294, 48.0792, 'US Army Central (ARCENT) forward headquarters and major logistics hub.', '[{"type": "M1A2 Abrams", "category": "armor", "quantity": 100}, {"type": "M2 Bradley", "category": "ifv", "quantity": 80}, {"type": "Patriot PAC-3", "category": "air_defense", "quantity": 4}]'),
('Ali Al Salem Air Base', 'Kuwait', 'US Air Force', 'air_base', 29.3467, 47.5208, 'Major personnel and cargo transit hub for CENTCOM operations.', '[{"type": "C-17 Globemaster III", "category": "transport", "quantity": 8}, {"type": "C-130J Hercules", "category": "transport", "quantity": 6}]'),
('Prince Sultan Air Base', 'Saudi Arabia', 'US Air Force', 'air_base', 24.0625, 47.5806, 'Reactivated US base south of Riyadh, hosts Patriot batteries and fighter squadrons.', '[{"type": "F-15E Strike Eagle", "category": "fighter", "quantity": 12}, {"type": "Patriot PAC-3", "category": "air_defense", "quantity": 2}, {"type": "THAAD", "category": "air_defense", "quantity": 1}]'),
('Camp Lemonnier', 'Djibouti', 'US Military', 'mixed', 11.5469, 43.1558, 'Primary US base in Africa, supports counter-terrorism and Horn of Africa operations.', '[{"type": "MQ-9 Reaper", "category": "uav", "quantity": 12}, {"type": "P-8A Poseidon", "category": "maritime_patrol", "quantity": 4}, {"type": "F-15E Strike Eagle", "category": "fighter", "quantity": 6}]'),
('Al Minhad Air Base', 'UAE', 'US/Coalition', 'air_base', 25.0234, 55.3664, 'Coalition logistics and staging base near Dubai.', '[{"type": "C-17 Globemaster III", "category": "transport", "quantity": 4}, {"type": "KC-30A", "category": "tanker", "quantity": 3}]'),

-- Israel
('Nevatim Air Base', 'Israel', 'Israeli Air Force', 'air_base', 31.2083, 34.9389, 'Home base for Israeli F-35I Adir stealth fighters.', '[{"type": "F-35I Adir", "category": "fighter", "quantity": 36}, {"type": "F-16I Sufa", "category": "fighter", "quantity": 24}]'),
('Ramon Air Base', 'Israel', 'Israeli Air Force', 'air_base', 30.7761, 34.6672, 'Southernmost IAF base, deep-strike and long-range operations.', '[{"type": "F-16I Sufa", "category": "fighter", "quantity": 24}, {"type": "F-15I Ra''am", "category": "fighter", "quantity": 12}]'),
('Hatzerim Air Base', 'Israel', 'Israeli Air Force', 'air_base', 31.2344, 34.6628, 'IAF flight school and operational fighter base in the Negev.', '[{"type": "F-16C/D Barak", "category": "fighter", "quantity": 20}, {"type": "M-346 Lavi", "category": "trainer", "quantity": 12}]'),
('Ramat David Air Base', 'Israel', 'Israeli Air Force', 'air_base', 32.6651, 35.1794, 'Northern IAF base, key for Lebanon/Syria theater operations.', '[{"type": "F-16C/D Barak", "category": "fighter", "quantity": 20}, {"type": "AH-64D Apache", "category": "attack_helo", "quantity": 12}]'),
('Palmachim Air Base', 'Israel', 'Israeli Air Force', 'mixed', 31.8978, 34.6908, 'Missile test range and space launch facility. Arrow and Iron Dome test site.', '[{"type": "Arrow-3", "category": "missile_defense", "quantity": 2}, {"type": "Heron TP", "category": "uav", "quantity": 6}]'),
('Haifa Naval Base', 'Israel', 'Israeli Navy', 'naval_base', 32.8186, 35.0000, 'Main Israeli Navy base, home port for submarine fleet.', '[{"type": "Dolphin-class submarine", "category": "submarine", "quantity": 5}, {"type": "Sa''ar 6 corvette", "category": "corvette", "quantity": 4}]'),
('Iron Dome Battery - Haifa', 'Israel', 'Israeli Air Force', 'missile_defense', 32.7900, 35.0100, 'Iron Dome short-range air defense protecting Haifa metropolitan area.', '[{"type": "Iron Dome", "category": "air_defense", "quantity": 2}]'),
('Iron Dome Battery - Tel Aviv', 'Israel', 'Israeli Air Force', 'missile_defense', 32.0853, 34.7818, 'Iron Dome batteries protecting Tel Aviv-Gush Dan metropolitan area.', '[{"type": "Iron Dome", "category": "air_defense", "quantity": 3}]'),
('David''s Sling Battery - Central', 'Israel', 'Israeli Air Force', 'missile_defense', 31.8970, 34.8100, 'Medium-range air defense system protecting central Israel.', '[{"type": "David''s Sling", "category": "air_defense", "quantity": 2}]'),

-- Iran
('Isfahan Air Base (8th TFB)', 'Iran', 'Iranian Air Force', 'air_base', 32.7508, 51.8614, 'Major IRIAF base, hosts F-14 Tomcat fleet and Su-24 Fencer bombers.', '[{"type": "F-14A Tomcat", "category": "fighter", "quantity": 20}, {"type": "Su-24MK Fencer", "category": "bomber", "quantity": 12}]'),
('Bushehr Air Base (6th TFB)', 'Iran', 'Iranian Air Force', 'air_base', 28.9481, 50.8350, 'Coastal IRIAF base near Bushehr nuclear power plant.', '[{"type": "F-4E Phantom II", "category": "fighter", "quantity": 12}, {"type": "Su-25 Frogfoot", "category": "attack", "quantity": 8}]'),
('Bandar Abbas Air Base (9th TFB)', 'Iran', 'Iranian Air Force', 'air_base', 27.2150, 56.1728, 'IRIAF base at the Strait of Hormuz, strategic chokepoint defense.', '[{"type": "F-4E Phantom II", "category": "fighter", "quantity": 12}, {"type": "P-3F Orion", "category": "maritime_patrol", "quantity": 3}]'),
('Shiraz Air Base (7th TFB)', 'Iran', 'Iranian Air Force', 'air_base', 29.5397, 52.5886, 'IRIAF tanker and transport hub, also hosts fighters.', '[{"type": "F-14A Tomcat", "category": "fighter", "quantity": 10}, {"type": "Boeing 747 tanker", "category": "tanker", "quantity": 3}]'),
('Tabriz Air Base (2nd TFB)', 'Iran', 'Iranian Air Force', 'air_base', 38.1339, 46.2350, 'Northwestern IRIAF base near Turkish and Azerbaijani borders.', '[{"type": "MiG-29A Fulcrum", "category": "fighter", "quantity": 18}, {"type": "F-5E Tiger II", "category": "fighter", "quantity": 12}]'),
('Chabahar Naval Base', 'Iran', 'Iranian Navy', 'naval_base', 25.2919, 60.6250, 'Iranian Navy base on the Gulf of Oman, controls access to Arabian Sea.', '[{"type": "Moudge-class frigate", "category": "frigate", "quantity": 2}, {"type": "Ghadir-class submarine", "category": "submarine", "quantity": 4}]'),
('Bandar Abbas Naval Base', 'Iran', 'IRGC Navy', 'naval_base', 27.1863, 56.2808, 'IRGCN headquarters at the Strait of Hormuz. Fast attack craft and missiles.', '[{"type": "Fast attack craft", "category": "patrol", "quantity": 30}, {"type": "C-802 anti-ship missile", "category": "missile", "quantity": 50}]'),
('Khatam al-Anbiya Air Defense HQ', 'Iran', 'Iranian Air Defense Force', 'command_center', 35.6892, 51.3890, 'National air defense command center in Tehran.', '[{"type": "S-300PMU2", "category": "air_defense", "quantity": 4}, {"type": "Bavar-373", "category": "air_defense", "quantity": 3}]'),
('Natanz Missile Defense', 'Iran', 'Iranian Air Defense Force', 'missile_defense', 33.7236, 51.7272, 'Air defense batteries protecting Natanz nuclear enrichment facility.', '[{"type": "S-300PMU2", "category": "air_defense", "quantity": 2}, {"type": "Tor-M1", "category": "air_defense", "quantity": 4}]'),
('Fordow Missile Defense', 'Iran', 'Iranian Air Defense Force', 'missile_defense', 34.8825, 51.0506, 'Air defense protecting Fordow underground enrichment facility.', '[{"type": "S-300PMU2", "category": "air_defense", "quantity": 1}, {"type": "Sayyad-3", "category": "air_defense", "quantity": 2}]'),
('Abu Musa Island', 'Iran', 'IRGC', 'mixed', 25.8711, 55.0333, 'Disputed island base with anti-ship missiles and radar controlling Strait of Hormuz.', '[{"type": "C-802 anti-ship missile", "category": "missile", "quantity": 6}, {"type": "Radar station", "category": "radar", "quantity": 2}]'),
('Shahid Dastgheib Missile Base', 'Iran', 'IRGC Aerospace', 'missile_defense', 29.6000, 52.5500, 'IRGC ballistic missile base near Shiraz.', '[{"type": "Emad MRBM", "category": "ballistic_missile", "quantity": 12}, {"type": "Sejjil MRBM", "category": "ballistic_missile", "quantity": 6}]'),

-- Russia
('Hmeimim Air Base', 'Syria', 'Russian Air Force', 'air_base', 35.4040, 35.9506, 'Primary Russian military air base in Syria. Supports all Russian operations in the Levant.', '[{"type": "Su-35S Flanker-E", "category": "fighter", "quantity": 6}, {"type": "Su-34 Fullback", "category": "bomber", "quantity": 4}, {"type": "S-400 Triumf", "category": "air_defense", "quantity": 2}, {"type": "Pantsir-S1", "category": "air_defense", "quantity": 4}]'),
('Tartus Naval Facility', 'Syria', 'Russian Navy', 'naval_base', 34.8869, 35.8861, 'Russia''s only Mediterranean naval base. Logistics and repair facility.', '[{"type": "Supply ships", "category": "support", "quantity": 3}, {"type": "Floating dock", "category": "support", "quantity": 1}]'),

-- UK
('RAF Akrotiri', 'Cyprus', 'Royal Air Force', 'air_base', 34.5906, 32.9819, 'British Sovereign Base Area. Key staging point for Middle East operations.', '[{"type": "Eurofighter Typhoon", "category": "fighter", "quantity": 6}, {"type": "Voyager KC2 tanker", "category": "tanker", "quantity": 2}]'),
('UKNSF Bahrain', 'Bahrain', 'Royal Navy', 'naval_base', 26.2320, 50.6200, 'UK Naval Support Facility, homeport for Type 23 frigates in the Gulf.', '[{"type": "Type 23 frigate", "category": "frigate", "quantity": 2}, {"type": "River-class OPV", "category": "patrol", "quantity": 2}]'),

-- France
('French Naval Base Abu Dhabi', 'UAE', 'French Navy', 'naval_base', 24.4539, 54.6500, 'French Forces HQ in the UAE, hosts rotating naval deployments.', '[{"type": "FREMM frigate", "category": "frigate", "quantity": 1}, {"type": "Rafale M", "category": "fighter", "quantity": 6}]'),
('French Forces Djibouti', 'Djibouti', 'French Military', 'mixed', 11.5475, 43.1464, 'France''s largest overseas military base. 1,500+ personnel.', '[{"type": "Mirage 2000-5", "category": "fighter", "quantity": 4}, {"type": "AMX-10 RC", "category": "armor", "quantity": 8}]'),

-- Regional Key Installations
('King Abdulaziz Air Base', 'Saudi Arabia', 'Royal Saudi Air Force', 'air_base', 26.2650, 50.1564, 'RSAF Eastern Province base, hosts F-15SA fleet.', '[{"type": "F-15SA", "category": "fighter", "quantity": 36}, {"type": "Eurofighter Typhoon", "category": "fighter", "quantity": 24}]'),
('Al Kharj Air Base', 'Saudi Arabia', 'Royal Saudi Air Force', 'air_base', 24.0700, 47.5800, 'RSAF base near Riyadh with advanced air defense.', '[{"type": "Tornado IDS", "category": "bomber", "quantity": 12}, {"type": "Patriot PAC-2", "category": "air_defense", "quantity": 3}]'),
('King Faisal Naval Base', 'Saudi Arabia', 'Royal Saudi Navy', 'naval_base', 21.4558, 39.1714, 'Royal Saudi Navy Western Fleet HQ on the Red Sea at Jeddah.', '[{"type": "Al Riyadh-class frigate", "category": "frigate", "quantity": 3}, {"type": "Al Sadiq-class patrol", "category": "patrol", "quantity": 4}]'),
('Al Mubarak Air Base', 'Kuwait', 'Kuwait Air Force', 'air_base', 29.2197, 47.9694, 'Kuwait Air Force primary fighter base.', '[{"type": "F/A-18C/D Hornet", "category": "fighter", "quantity": 24}, {"type": "Eurofighter Typhoon", "category": "fighter", "quantity": 12}]'),
('Ahmed Al Jaber Air Base', 'Kuwait', 'Kuwait Air Force', 'air_base', 28.9347, 47.7917, 'Kuwait Air Force secondary base.', '[{"type": "AH-64D Apache", "category": "attack_helo", "quantity": 8}, {"type": "Patriot PAC-3", "category": "air_defense", "quantity": 2}]'),
('Al Ain Air Base', 'UAE', 'UAE Air Force', 'air_base', 24.2617, 55.6094, 'UAEAF base hosting Mirage 2000 fleet.', '[{"type": "Mirage 2000-9", "category": "fighter", "quantity": 30}]'),
('Balad Air Base', 'Iraq', 'Iraqi Air Force', 'air_base', 33.9400, 44.3614, 'Largest Iraqi Air Force base north of Baghdad.', '[{"type": "F-16IQ Block 52", "category": "fighter", "quantity": 14}, {"type": "T-50 Golden Eagle", "category": "trainer", "quantity": 6}]'),
('Muscat Naval Base', 'Oman', 'Royal Navy of Oman', 'naval_base', 23.6250, 58.5900, 'Main Royal Navy of Oman facility at Said Bin Sultan Naval Base.', '[{"type": "Khareef-class corvette", "category": "corvette", "quantity": 3}]'),
('Thumrait Air Base', 'Oman', 'Royal Air Force of Oman', 'air_base', 17.6660, 54.0247, 'RAFO base in southern Oman, used for coalition operations.', '[{"type": "F-16C/D Block 50", "category": "fighter", "quantity": 12}, {"type": "Eurofighter Typhoon", "category": "fighter", "quantity": 12}]'),
('Incirlik Air Base', 'Turkey', 'US Air Force / Turkish Air Force', 'air_base', 37.0022, 35.4258, 'Joint US-Turkish base, historically hosts US nuclear weapons.', '[{"type": "F-16C/D", "category": "fighter", "quantity": 6}, {"type": "KC-135 Stratotanker", "category": "tanker", "quantity": 4}]');

-- ========================================
-- SEED: Military Naval Assets
-- ========================================

INSERT INTO military_naval_assets (name, asset_type, operator, hull_number, class_name, latitude, longitude, heading, region, status, last_reported_date, source_description) VALUES
-- US Navy - Abraham Lincoln CSG
('USS Abraham Lincoln', 'carrier', 'US Navy', 'CVN-72', 'Nimitz-class', 25.2000, 56.5000, 270, 'Arabian Sea', 'deployed', '2026-03-01', 'OSINT tracking / USNI News fleet tracker'),
('USS Spruance', 'destroyer', 'US Navy', 'DDG-111', 'Arleigh Burke-class', 25.3000, 56.3000, 265, 'Arabian Sea', 'deployed', '2026-03-01', 'CSG-3 escort'),
('USS Dewey', 'destroyer', 'US Navy', 'DDG-105', 'Arleigh Burke-class', 25.1500, 56.7000, 275, 'Arabian Sea', 'deployed', '2026-03-01', 'CSG-3 escort'),
('USS Mobile Bay', 'cruiser', 'US Navy', 'CG-53', 'Ticonderoga-class', 25.2500, 56.4000, 268, 'Arabian Sea', 'deployed', '2026-03-01', 'CSG-3 escort'),
('USS Princeton', 'cruiser', 'US Navy', 'CG-59', 'Ticonderoga-class', 26.0000, 52.0000, 180, 'Persian Gulf', 'deployed', '2026-02-28', 'NAVCENT operations'),

-- US Navy - Independent deployers
('USS Bataan', 'amphibious', 'US Navy', 'LHD-5', 'Wasp-class', 13.2000, 44.8000, 90, 'Gulf of Aden', 'deployed', '2026-02-25', 'Red Sea / Bab el-Mandeb operations'),
('USS Mesa Verde', 'amphibious', 'US Navy', 'LPD-19', 'San Antonio-class', 13.5000, 45.0000, 85, 'Gulf of Aden', 'deployed', '2026-02-25', 'ARG escort'),
('USS Carney', 'destroyer', 'US Navy', 'DDG-64', 'Arleigh Burke-class', 14.5000, 42.0000, 180, 'Red Sea', 'deployed', '2026-02-20', 'Red Sea air defense operations'),
('USS Mason', 'destroyer', 'US Navy', 'DDG-87', 'Arleigh Burke-class', 14.0000, 42.5000, 170, 'Red Sea', 'deployed', '2026-02-20', 'Red Sea air defense operations'),
('USS Florida', 'submarine', 'US Navy', 'SSGN-728', 'Ohio-class', 26.5000, 53.0000, 0, 'Persian Gulf', 'deployed', '2026-02-15', 'CENTCOM submarine operations'),

-- UK Royal Navy
('HMS Diamond', 'destroyer', 'Royal Navy', 'D34', 'Type 45', 14.8000, 42.2000, 160, 'Red Sea', 'deployed', '2026-02-28', 'UK Red Sea escort operations'),
('HMS Lancaster', 'frigate', 'Royal Navy', 'F229', 'Type 23', 26.5000, 51.5000, 90, 'Persian Gulf', 'deployed', '2026-03-01', 'Gulf patrol / UKNSF Bahrain'),

-- French Navy
('FS Alsace', 'frigate', 'French Navy', 'D656', 'FREMM-class', 12.8000, 44.5000, 45, 'Gulf of Aden', 'deployed', '2026-02-25', 'French TF operations'),

-- Iranian Navy / IRGCN
('IRIS Sahand', 'frigate', 'Iranian Navy', 'F74', 'Moudge-class', 26.8000, 56.3000, 90, 'Strait of Hormuz', 'patrol', '2026-03-01', 'OSINT - Strait of Hormuz patrol'),
('IRIS Dena', 'frigate', 'Iranian Navy', 'F75', 'Moudge-class', 25.5000, 57.5000, 180, 'Gulf of Oman', 'patrol', '2026-02-28', 'Gulf of Oman patrol'),
('IRGCN Fast Attack Group', 'patrol', 'IRGC Navy', 'FAC-GRP', 'Mixed', 26.6000, 56.1000, 45, 'Strait of Hormuz', 'patrol', '2026-03-01', 'OSINT - Hormuz patrol flotilla');

-- ========================================
-- SEED: Maritime Zones
-- ========================================

INSERT INTO maritime_zones (zone_name, description, bbox_south, bbox_west, bbox_north, bbox_east) VALUES
('Persian Gulf', 'Full Persian/Arabian Gulf coverage from Strait of Hormuz to Kuwait', 24.0, 48.0, 30.5, 56.5),
('Strait of Hormuz', 'Critical chokepoint between Persian Gulf and Gulf of Oman', 25.5, 55.5, 27.0, 57.0),
('Red Sea', 'Red Sea from Suez to Bab el-Mandeb', 12.0, 32.5, 30.0, 44.0),
('Bab el-Mandeb', 'Southern entrance to Red Sea between Yemen and Djibouti', 11.5, 42.5, 13.5, 44.5),
('Suez Canal', 'Suez Canal and approaches', 29.5, 32.0, 31.5, 33.5),
('Eastern Mediterranean', 'Eastern Mediterranean from Cyprus to Egypt/Lebanon/Israel', 31.0, 28.0, 37.0, 36.0),
('Gulf of Aden', 'Gulf of Aden from Bab el-Mandeb to Arabian Sea', 11.0, 43.0, 15.5, 52.0),
('Arabian Sea - Western', 'Western Arabian Sea including approaches to Gulf of Oman', 15.0, 52.0, 25.0, 62.0);

-- Create indexes for spatial queries
CREATE INDEX IF NOT EXISTS idx_military_bases_coords ON military_bases (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_naval_assets_coords ON military_naval_assets (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_maritime_zones_active ON maritime_zones (is_active);
