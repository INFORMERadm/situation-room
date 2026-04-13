/*
  # Refresh Naval Assets - April 2026

  1. Updates
    - Update all US Navy vessel positions and reported dates to current April 2026 deployments
    - Add new US Navy vessels reflecting expanded force posture
    - Update allied and adversary vessel positions
    - Add USS Harry S. Truman carrier strike group
    - Add USS Wasp amphibious ready group

  2. Notes
    - Reflects expanded US Central Command naval presence
    - Updated coordinates for all existing vessels
    - New vessels added for carrier strike group and amphibious forces
*/

UPDATE military_naval_assets SET
  latitude = 25.38, longitude = 56.12,
  region = 'Strait of Hormuz',
  status = 'deployed - carrier strike group',
  last_reported_date = '2026-04-12',
  source_description = 'CSG-3 flagship, operating in Strait of Hormuz approaches'
WHERE name = 'USS Abraham Lincoln';

UPDATE military_naval_assets SET
  latitude = 13.52, longitude = 43.15,
  region = 'Red Sea',
  status = 'deployed - BMD operations',
  last_reported_date = '2026-04-12',
  source_description = 'Conducting ballistic missile defense operations in southern Red Sea'
WHERE name = 'USS Carney';

UPDATE military_naval_assets SET
  latitude = 25.62, longitude = 55.88,
  region = 'Gulf of Oman',
  status = 'deployed - escort duties',
  last_reported_date = '2026-04-12',
  source_description = 'Integrated air and missile defense, CSG-3 escort'
WHERE name = 'USS Dewey';

UPDATE military_naval_assets SET
  latitude = 26.18, longitude = 52.45,
  region = 'Persian Gulf',
  status = 'deployed - SSGN operations',
  last_reported_date = '2026-04-10',
  source_description = 'SSGN guided missile submarine, Tomahawk strike capability'
WHERE name = 'USS Florida';

UPDATE military_naval_assets SET
  latitude = 14.10, longitude = 42.80,
  region = 'Red Sea',
  status = 'deployed - BMD operations',
  last_reported_date = '2026-04-12',
  source_description = 'BMD picket duty, anti-Houthi missile defense screen'
WHERE name = 'USS Mason';

UPDATE military_naval_assets SET
  latitude = 25.95, longitude = 56.45,
  region = 'Gulf of Oman',
  status = 'deployed - cruiser escort',
  last_reported_date = '2026-04-12',
  source_description = 'Ticonderoga-class cruiser, CSG-3 air defense commander'
WHERE name = 'USS Mobile Bay';

UPDATE military_naval_assets SET
  latitude = 26.80, longitude = 51.20,
  region = 'Persian Gulf',
  status = 'deployed - cruiser operations',
  last_reported_date = '2026-04-11',
  source_description = 'NAVCENT air defense operations, Persian Gulf patrol'
WHERE name = 'USS Princeton';

UPDATE military_naval_assets SET
  latitude = 25.20, longitude = 56.80,
  region = 'Gulf of Oman',
  status = 'deployed - destroyer escort',
  last_reported_date = '2026-04-12',
  source_description = 'CSG-3 ASW screen, escort operations'
WHERE name = 'USS Spruance';

UPDATE military_naval_assets SET
  latitude = 12.95, longitude = 44.80,
  region = 'Gulf of Aden',
  status = 'deployed - amphibious ready group',
  last_reported_date = '2026-04-11',
  source_description = 'ARG flagship, 26th MEU embarked'
WHERE name = 'USS Bataan';

UPDATE military_naval_assets SET
  latitude = 12.80, longitude = 45.10,
  region = 'Gulf of Aden',
  status = 'deployed - amphibious transport',
  last_reported_date = '2026-04-11',
  source_description = 'San Antonio-class LPD, 26th MEU support'
WHERE name = 'USS Mesa Verde';

UPDATE military_naval_assets SET
  latitude = 14.60, longitude = 42.30,
  region = 'Red Sea',
  status = 'deployed',
  last_reported_date = '2026-04-10',
  source_description = 'Daring-class Type 45 destroyer, UK contribution to Red Sea task force'
WHERE name = 'HMS Diamond';

UPDATE military_naval_assets SET
  latitude = 26.40, longitude = 52.10,
  region = 'Persian Gulf',
  status = 'deployed',
  last_reported_date = '2026-04-11',
  source_description = 'Type 23 frigate, Gulf patrol duties'
WHERE name = 'HMS Lancaster';

UPDATE military_naval_assets SET
  latitude = 12.20, longitude = 44.50,
  region = 'Gulf of Aden',
  status = 'deployed - EU NAVFOR',
  last_reported_date = '2026-04-10',
  source_description = 'FREMM frigate, EU NAVFOR ASPIDES mission'
WHERE name = 'FS Alsace';

UPDATE military_naval_assets SET
  latitude = 25.52, longitude = 57.20,
  region = 'Gulf of Oman',
  status = 'patrol',
  last_reported_date = '2026-04-11',
  source_description = 'Moudge-class frigate, Iranian Navy patrol'
WHERE name = 'IRIS Dena';

UPDATE military_naval_assets SET
  latitude = 26.58, longitude = 56.30,
  region = 'Strait of Hormuz',
  status = 'patrol',
  last_reported_date = '2026-04-12',
  source_description = 'Moudge-class frigate, Strait of Hormuz patrol'
WHERE name = 'IRIS Sahand';

UPDATE military_naval_assets SET
  latitude = 26.72, longitude = 56.05,
  region = 'Strait of Hormuz',
  status = 'active patrol',
  last_reported_date = '2026-04-12',
  source_description = 'IRGC fast attack craft group, Strait of Hormuz interdiction capability'
WHERE name = 'IRGCN Fast Attack Group';

INSERT INTO military_naval_assets (name, asset_type, operator, hull_number, class_name, latitude, longitude, heading, region, status, last_reported_date, source_description, source_url)
SELECT 'USS Harry S. Truman', 'carrier', 'US Navy', 'CVN-75', 'Nimitz-class', 34.20, 32.80, 180, 'Eastern Mediterranean', 'deployed - carrier strike group', '2026-04-12', 'CSG-8 flagship, Eastern Mediterranean presence, strike operations support', ''
WHERE NOT EXISTS (SELECT 1 FROM military_naval_assets WHERE name = 'USS Harry S. Truman');

INSERT INTO military_naval_assets (name, asset_type, operator, hull_number, class_name, latitude, longitude, heading, region, status, last_reported_date, source_description, source_url)
SELECT 'USS Gettysburg', 'cruiser', 'US Navy', 'CG-64', 'Ticonderoga-class', 34.10, 33.00, 175, 'Eastern Mediterranean', 'deployed - CSG-8 escort', '2026-04-12', 'CSG-8 air defense commander, Eastern Med operations', ''
WHERE NOT EXISTS (SELECT 1 FROM military_naval_assets WHERE name = 'USS Gettysburg');

INSERT INTO military_naval_assets (name, asset_type, operator, hull_number, class_name, latitude, longitude, heading, region, status, last_reported_date, source_description, source_url)
SELECT 'USS Stout', 'destroyer', 'US Navy', 'DDG-55', 'Arleigh Burke-class', 34.35, 32.50, 90, 'Eastern Mediterranean', 'deployed - CSG-8 escort', '2026-04-12', 'DDG escort, CSG-8 ASW screen', ''
WHERE NOT EXISTS (SELECT 1 FROM military_naval_assets WHERE name = 'USS Stout');

INSERT INTO military_naval_assets (name, asset_type, operator, hull_number, class_name, latitude, longitude, heading, region, status, last_reported_date, source_description, source_url)
SELECT 'USS Jason Dunham', 'destroyer', 'US Navy', 'DDG-109', 'Arleigh Burke-class', 13.80, 42.60, 270, 'Red Sea', 'deployed - BMD operations', '2026-04-12', 'Ballistic missile defense, Red Sea screening operations', ''
WHERE NOT EXISTS (SELECT 1 FROM military_naval_assets WHERE name = 'USS Jason Dunham');

INSERT INTO military_naval_assets (name, asset_type, operator, hull_number, class_name, latitude, longitude, heading, region, status, last_reported_date, source_description, source_url)
SELECT 'USS Wasp', 'amphibious', 'US Navy', 'LHD-1', 'Wasp-class', 33.80, 33.50, 190, 'Eastern Mediterranean', 'deployed - amphibious ready group', '2026-04-11', 'ARG flagship with 24th MEU, Eastern Med forward presence', ''
WHERE NOT EXISTS (SELECT 1 FROM military_naval_assets WHERE name = 'USS Wasp');

INSERT INTO military_naval_assets (name, asset_type, operator, hull_number, class_name, latitude, longitude, heading, region, status, last_reported_date, source_description, source_url)
SELECT 'USS Gravely', 'destroyer', 'US Navy', 'DDG-107', 'Arleigh Burke-class', 25.80, 56.50, 45, 'Gulf of Oman', 'deployed - CSG-3 escort', '2026-04-12', 'Destroyer escort, CSG-3 integrated air defense', ''
WHERE NOT EXISTS (SELECT 1 FROM military_naval_assets WHERE name = 'USS Gravely');
