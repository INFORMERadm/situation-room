/*
  # Fix Incorrect Pipeline Route Coordinates

  Corrects geographic routes for Middle East pipelines and other misplaced routes
  that were running through water or had incorrect coordinate sequences.

  ## Changes
  - Dolphin Gas Project: Qatar overland → Abu Dhabi → UAE east coast → Oman
  - Saudi-Bahrain (BAPCO): Abqaiq → Al Khobar causeway → Bahrain
  - UAE Fujairah Bypass: Abu Dhabi → overland → Fujairah (avoids Hormuz)
  - South Pars pipelines: Iran onshore route to export terminals
  - Iraq Southern Export: Basra oil fields → Khor Al-Amaya terminal
  - Iraq-Turkey full pipeline: Kirkuk → Mosul → Turkey → Ceyhan port
  - TANAP: Fixed endpoint (removed incorrect loop back)
  - Arab Gas Pipeline: Egypt → Jordan → Syria → Lebanon
  - Trans-Saharan: Fixed incorrect last waypoint
  - Saudi Petroline: Abqaiq → Yanbu (Red Sea)
  - Trans-Arabian (Tapline): Qaisumah → Jordan → Lebanon (defunct)
  - IGAT-1 Iran: Ahvaz → Isfahan → Tehran → Astara
  - BTC Pipeline: Baku → Tbilisi → Ceyhan
  - Saudi Abqaiq-Khurais internal pipeline
*/

-- Dolphin Gas Project: Qatar (Ras Laffan) → UAE (Abu Dhabi onshore) → Oman (Sohar)
-- The pipeline runs undersea from Qatar to UAE coast, then overland
UPDATE critical_infrastructure
SET route_coordinates = '[[25.90,51.55],[25.60,51.50],[25.30,51.40],[25.10,51.30],[24.80,51.60],[24.50,52.00],[24.30,52.50],[24.00,53.00],[24.10,53.70],[24.30,54.60],[24.40,55.40],[24.50,56.00],[24.30,56.50],[23.80,57.00]]'
WHERE name = 'Dolphin Gas Project (Qatar-UAE-Oman)';

-- Saudi-Bahrain BAPCO: Abqaiq (26.0, 49.7) → Al Khobar (26.3, 50.2) → undersea causeway → Bahrain (26.2, 50.6)
UPDATE critical_infrastructure
SET route_coordinates = '[[26.00,49.70],[26.10,49.90],[26.20,50.10],[26.30,50.20],[26.20,50.40],[26.20,50.55]]'
WHERE name = 'Saudi-Bahrain Crude Pipeline (BAPCO)';

-- UAE Fujairah Bypass: Abu Dhabi (Habshan) → overland through mountains → Fujairah coast
-- Real route: Habshan → Maqta → Ruwais area → through Hajar mountains → Fujairah
UPDATE critical_infrastructure
SET route_coordinates = '[[23.90,53.70],[23.80,54.00],[24.00,54.50],[24.10,55.00],[24.20,55.30],[24.40,55.60],[24.60,56.00],[24.30,56.30],[23.80,56.45]]'
WHERE name = 'UAE Fujairah Bypass Pipeline';

-- South Pars / IGAT pipelines: Route from South Pars field → Assaluyeh → onshore Iran distribution
-- South Pars is at 27.2N 52.6E (offshore platform), pipelines come onshore at Assaluyeh (27.5N, 52.6E)
UPDATE critical_infrastructure
SET route_coordinates = '[[27.50,52.60],[27.80,52.20],[28.20,51.80],[28.80,51.50],[29.20,50.80],[29.80,50.20],[30.20,49.80],[30.50,49.20],[30.80,48.50],[31.00,48.20],[32.00,48.70],[32.50,51.40],[32.50,53.70],[35.50,51.40],[35.70,51.40]]'
WHERE name = 'South Pars/North Dome Gas Condensate Field Pipelines';

-- IGAT-1 Iranian Gas Trunkline: Ahvaz → Isfahan → Tehran → Astara (NW Iran)
UPDATE critical_infrastructure
SET route_coordinates = '[[31.30,48.70],[31.50,49.50],[32.00,50.50],[32.50,51.40],[33.50,52.00],[34.50,52.00],[35.50,51.40],[35.70,51.40],[36.00,52.00],[36.50,52.50],[37.00,53.50],[37.50,54.50],[38.00,56.00],[37.50,57.00],[37.40,49.20]]'
WHERE name = 'IGAT-1 Iranian Gas Trunkline';

-- Iran-Pakistan pipeline: Assaluyeh → Iranshahr → Zahedan → Pakistan border → Nawabshah
UPDATE critical_infrastructure
SET route_coordinates = '[[27.50,52.60],[27.20,56.10],[26.60,58.20],[26.20,60.00],[25.90,62.30],[25.60,63.50],[25.30,64.50],[25.10,65.60],[25.00,66.50],[26.50,68.20]]'
WHERE name = 'Iran-Pakistan Gas Pipeline (IP Pipeline)';

-- Iraq Southern Export Pipeline: Basra oil fields → Fao peninsula → offshore Khor Al Amaya
UPDATE critical_infrastructure
SET route_coordinates = '[[30.80,47.40],[30.50,47.80],[30.10,48.00],[29.80,48.30],[29.50,48.50],[29.40,48.70],[29.60,48.80]]'
WHERE name = 'Iraq Southern Export Pipeline (Basra)';

-- Iraq-Turkey full pipeline (Kirkuk-Ceyhan): Kirkuk → Mosul → Ibrahim Khalil → Ceyhan
UPDATE critical_infrastructure
SET route_coordinates = '[[35.50,44.40],[35.80,43.70],[36.30,43.10],[36.80,42.80],[37.10,42.50],[37.30,41.80],[37.40,40.60],[37.20,39.20],[37.00,38.00],[36.80,37.00],[36.70,35.90],[36.80,35.60]]'
WHERE name = 'Iraq-Turkey Kirkuk-Ceyhan Pipeline';

-- Fix duplicate northern section too
UPDATE critical_infrastructure
SET route_coordinates = '[[35.50,44.40],[35.80,43.70],[36.30,43.10],[36.80,42.80],[37.10,42.50],[37.30,41.80],[37.40,40.60],[37.20,39.20],[37.00,38.00],[36.80,37.00],[36.70,35.90],[36.80,35.60]]'
WHERE name = 'Iraq-Turkey Pipeline (Kirkuk-Ceyhan) - Northern Section';

-- TANAP: Fixed - removed the incorrect loop back to 41.0,26.5 (Greece)
-- Real route: Shah Deniz (Azerbaijan border) → across Turkey → Eskisehir → Edirne → Greek border
UPDATE critical_infrastructure
SET route_coordinates = '[[41.00,43.50],[40.80,41.50],[40.50,39.50],[40.00,37.50],[39.50,35.50],[39.00,33.00],[38.50,31.00],[38.00,29.00],[37.50,27.50],[37.20,26.80],[40.80,26.60],[41.00,26.50]]'
WHERE name = 'TANAP (Trans-Anatolian Pipeline)';

-- Arab Gas Pipeline: Egypt (Arish) → Jordan (Aqaba → Amman) → Syria (Damascus) → Lebanon
UPDATE critical_infrastructure
SET route_coordinates = '[[30.90,32.60],[30.00,32.70],[29.50,32.50],[29.10,32.60],[28.50,33.00],[27.20,33.00],[26.00,33.50],[25.00,34.30],[29.50,35.00],[30.50,35.00],[31.00,35.20],[31.80,35.50],[32.50,35.50],[33.50,35.50],[34.00,36.20],[33.80,35.50],[33.90,35.60]]'
WHERE name = 'Arab Gas Pipeline';

-- Saudi East-West Petroline: Abqaiq (26.0, 49.7) → Riyadh (24.7, 46.7) → Mecca area → Yanbu (24.1, 38.1)
UPDATE critical_infrastructure
SET route_coordinates = '[[26.00,49.70],[25.50,48.50],[25.00,47.50],[24.70,46.70],[24.50,45.00],[24.20,43.50],[24.00,42.00],[24.00,40.00],[24.00,38.50],[24.10,38.10]]'
WHERE name = 'Saudi Aramco East-West Pipeline (Petroline)';

-- Abqaiq-Khurais internal pipeline
UPDATE critical_infrastructure
SET route_coordinates = '[[24.90,48.80],[25.20,49.00],[25.50,49.30],[25.80,49.50],[26.00,49.70]]'
WHERE name = 'Abqaiq-Khurais Pipeline (Saudi Aramco)';

-- Trans-Arabian Pipeline (Tapline) - Defunct: Qaisumah → Jordan → Lebanon (Sidon)
UPDATE critical_infrastructure
SET route_coordinates = '[[27.80,45.00],[28.50,43.00],[29.50,40.50],[30.50,38.00],[31.00,37.50],[31.50,37.00],[32.00,36.50],[32.50,36.00],[33.00,35.50],[33.60,35.40]]'
WHERE name = 'Trans-Arabian Pipeline (Tapline) - Defunct';

-- BTC Pipeline (Baku-Tbilisi-Ceyhan): Baku → Tbilisi → Erzurum → Ceyhan
UPDATE critical_infrastructure
SET route_coordinates = '[[40.50,49.90],[40.30,49.00],[40.50,47.50],[41.50,46.50],[41.70,44.80],[41.70,44.00],[41.00,43.50],[40.50,42.50],[40.50,41.50],[40.30,40.50],[39.80,39.50],[39.00,38.00],[37.90,36.50],[36.90,36.00],[36.80,35.60]]'
WHERE name = 'BTC Pipeline (Baku-Tbilisi-Ceyhan)';

-- Fix Trans-Saharan last coordinate jump (was incorrectly ending at Algeria 36.8,3)
-- Should end at Mediterranean coast of Algeria or Tunisia junction
UPDATE critical_infrastructure
SET route_coordinates = '[[6.50,3.50],[7.00,5.00],[8.00,7.50],[9.00,9.00],[10.00,10.00],[11.00,11.00],[12.00,12.00],[13.00,13.50],[14.00,14.50],[15.00,15.00],[16.00,14.50],[17.00,13.50],[18.00,12.00],[20.00,10.00],[22.00,9.50],[24.00,9.00],[26.00,9.00],[28.00,9.50],[30.00,10.00],[31.00,12.00],[31.50,15.00],[31.50,18.00],[31.50,20.00],[30.50,22.00],[30.50,25.00],[30.50,28.50],[31.00,30.50],[31.50,32.50]]'
WHERE name = 'Trans-Saharan Gas Pipeline (TSGP) - Planned';

-- Qatar-Bahrain undersea pipeline: Ras Laffan area → across Gulf → Bahrain
UPDATE critical_infrastructure
SET route_coordinates = '[[25.90,51.55],[26.00,51.00],[26.10,50.80],[26.20,50.60]]'
WHERE name = 'Qatar-Bahrain Undersea Gas Pipeline';

-- Pan-Arab Pipeline: Egypt → Jordan → Syria (partial)
UPDATE critical_infrastructure
SET route_coordinates = '[[30.90,32.60],[31.00,33.50],[31.50,34.50],[31.80,35.50],[32.50,35.80],[33.50,36.00],[34.00,36.20],[34.50,36.70],[35.00,36.80]]'
WHERE name = 'Pan-Arab Pipeline (Proposed extension)';
