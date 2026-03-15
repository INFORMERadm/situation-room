/*
  # Pipeline Route Coordinates - Part 2: Middle East, Asia-Pacific
*/

-- ============================================================
-- MIDDLE EAST PIPELINES
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[25.00,50.50],[25.50,51.00],[26.00,51.30]]'
WHERE name = 'Qatar-Bahrain Undersea Gas Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[25.50,51.50],[25.30,52.50],[24.80,53.50],[24.50,54.50],[24.00,55.00],[23.50,55.50],[23.80,57.00]]'
WHERE name = 'Dolphin Gas Project (Qatar-UAE-Oman)';

UPDATE critical_infrastructure SET route_coordinates = '[[23.80,56.50],[24.00,55.50],[24.20,54.50],[24.50,54.00],[24.30,52.50],[24.00,52.00]]'
WHERE name = 'UAE Fujairah Bypass Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[26.20,50.20],[25.50,50.00],[25.00,49.80],[24.50,49.50],[24.00,49.00],[23.50,48.50],[23.00,48.00],[22.50,47.50]]'
WHERE name = 'Saudi-Bahrain Crude Pipeline (BAPCO)';

UPDATE critical_infrastructure SET route_coordinates = '[[37.50,42.50],[37.00,40.00],[36.50,38.50],[36.00,37.00],[36.50,36.00],[36.50,35.50],[36.70,35.50]]'
WHERE name = 'Iraq-Turkey Pipeline (Kirkuk-Ceyhan) - Northern Section';

UPDATE critical_infrastructure SET route_coordinates = '[[30.50,47.50],[29.80,48.50],[29.50,48.80]]'
WHERE name = 'Iraq Southern Export Pipeline (Basra)';

UPDATE critical_infrastructure SET route_coordinates = '[[27.80,52.00],[28.00,53.00],[27.50,54.00],[27.00,55.00],[26.50,56.50],[26.00,57.00],[25.50,57.00]]'
WHERE name = 'South Pars/North Dome Gas Condensate Field Pipelines';

UPDATE critical_infrastructure SET route_coordinates = '[[27.50,57.00],[28.00,60.00],[28.00,62.00],[27.50,63.00],[27.00,64.00],[26.50,64.50]]'
WHERE name = 'Iran-Pakistan Gas Pipeline (IP Pipeline)';

-- Iraq-Turkey pipeline northern section (Kirkuk to Ceyhan)
UPDATE critical_infrastructure SET route_coordinates = '[[35.50,44.00],[36.00,43.50],[36.50,42.50],[37.00,41.00],[37.50,40.00],[37.00,38.50],[36.80,36.50],[36.70,35.50]]'
WHERE name = 'Iraq-Turkey Pipeline (Kirkuk-Ceyhan) - Northern Section';

-- ============================================================
-- ASIA-PACIFIC PIPELINES
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[48.50,127.00],[47.00,128.50],[45.50,130.00],[44.00,131.00],[43.00,132.50],[42.00,134.00],[42.50,135.50],[41.50,137.00],[40.50,138.00],[39.50,139.00],[36.00,140.00]]'
WHERE name = 'Siberia-China Gas Pipeline (Power of Siberia)';

UPDATE critical_infrastructure SET route_coordinates = '[[43.50,80.50],[42.00,80.00],[41.00,80.50],[39.50,82.00],[38.00,83.00],[36.00,86.00],[36.00,90.00],[36.50,94.00],[36.00,98.00],[35.00,102.00],[34.50,104.00],[34.00,108.00],[33.50,112.00],[31.50,117.00],[31.00,120.00],[31.20,121.50]]'
WHERE name = 'West-East Gas Pipeline System (China)';

UPDATE critical_infrastructure SET route_coordinates = '[[30.00,104.00],[30.50,108.00],[30.50,112.00],[30.00,114.50],[31.00,117.00],[31.50,120.00],[31.20,121.50]]'
WHERE name = 'Sichuan-to-East Gas Pipeline (China)';

UPDATE critical_infrastructure SET route_coordinates = '[[16.00,97.50],[17.50,96.50],[19.00,96.00],[20.00,96.50],[21.50,97.00],[22.50,97.50],[24.00,97.50],[25.50,98.00],[27.50,100.00]]'
WHERE name = 'Myanmar-China Oil Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[1.00,104.00],[1.50,104.50],[2.00,105.00],[2.50,106.00],[3.00,107.00],[3.50,108.00],[4.50,108.50],[5.00,109.50],[5.50,110.50],[6.00,111.00],[7.00,111.50]]'
WHERE name = 'Natuna Gas Pipeline (Indonesia-Singapore)';

UPDATE critical_infrastructure SET route_coordinates = '[[-20.50,116.50],[-20.00,117.00],[-20.00,118.00],[-20.00,119.50],[-20.50,120.00]]'
WHERE name = 'Australia Northwest Shelf Pipelines (Karratha)';

UPDATE critical_infrastructure SET route_coordinates = '[[-20.50,116.70],[-22.00,117.00],[-24.00,115.50],[-26.00,115.00],[-28.00,114.50],[-30.00,115.00],[-31.00,115.50],[-32.00,115.70],[-33.50,115.60]]'
WHERE name = 'Dampier-to-Bunbury Gas Pipeline (DBNGP)';

UPDATE critical_infrastructure SET route_coordinates = '[[-38.30,146.50],[-37.50,148.00],[-36.00,149.50],[-34.50,150.50],[-34.00,150.80]]'
WHERE name = 'Eastern Gas Pipeline (Australia)';

UPDATE critical_infrastructure SET route_coordinates = '[[-6.50,144.00],[-7.00,145.00],[-7.50,146.00],[-8.00,146.50],[-9.00,147.00],[-9.50,147.20]]'
WHERE name = 'Papua New Guinea LNG Pipeline (PNG LNG)';

UPDATE critical_infrastructure SET route_coordinates = '[[23.50,88.50],[23.00,88.80],[22.50,89.50],[22.00,90.00],[23.00,90.50],[24.00,91.00]]'
WHERE name = 'India-Bangladesh Gas Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[26.50,72.00],[25.50,72.50],[25.00,73.00],[24.00,73.50],[23.00,73.00],[22.50,72.50],[22.00,72.00],[22.50,71.00],[23.00,70.50]]'
WHERE name = 'Rajasthan-Salaya Oil Pipeline (India)';

UPDATE critical_infrastructure SET route_coordinates = '[[21.50,73.00],[22.50,74.00],[23.50,76.00],[24.00,78.00],[25.00,80.00],[25.50,82.00],[26.50,82.50],[27.00,81.00],[27.50,80.00],[28.00,78.50],[28.50,77.00]]'
WHERE name = 'Hazira-Vijaipur-Jagdishpur (HVJ) Gas Pipeline India';

-- ============================================================
-- US GULF COAST LNG
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[29.50,-93.50],[29.60,-93.60],[29.73,-93.87]]'
WHERE name = 'US Gulf Coast LNG Export Hub (Total)';

UPDATE critical_infrastructure SET route_coordinates = '[[28.98,-95.36],[29.00,-95.00],[29.20,-94.50],[29.40,-94.00]]'
WHERE name = 'Freeport LNG Terminal (Pipelines)';

-- ============================================================
-- MEXICO
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[19.50,-91.50],[19.80,-92.50],[19.50,-93.50],[19.00,-94.50],[18.50,-95.50],[18.00,-96.50],[18.30,-97.00],[18.50,-97.50],[19.00,-97.00],[19.50,-96.50]]'
WHERE name = 'Pemex Gas Pipeline Network (Mexico)';

-- ============================================================
-- LNG CHOKEPOINTS / STRATEGIC ROUTES
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[1.50,101.00],[2.00,102.00],[2.50,103.50],[1.50,104.00]]'
WHERE name = 'Strait of Malacca Oil Transit (Tanker Route)';

UPDATE critical_infrastructure SET route_coordinates = '[[-33.90,18.00],[-34.50,20.00],[-35.00,24.00],[-34.00,28.00],[-32.00,32.00],[-28.00,36.00]]'
WHERE name = 'Cape of Good Hope Route (Oil Diversion)';

UPDATE critical_infrastructure SET route_coordinates = '[[-8.75,115.00],[-8.50,115.50],[-8.00,116.00]]'
WHERE name = 'Lombok Strait Oil Route (Indonesia)';

UPDATE critical_infrastructure SET route_coordinates = '[[54.40,8.00],[54.50,9.50],[54.50,11.00],[54.50,12.00],[54.50,13.50]]'
WHERE name = 'Baltic Sea LNG Route (FSRUs)';

-- ============================================================
-- MOZAMBIQUE / AFRICA LNG
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[-15.50,40.60],[-14.50,40.50],[-13.50,40.80],[-12.50,40.50],[-11.50,40.70],[-10.50,40.50]]'
WHERE name = 'Mozambique LNG Pipeline (Rovuma)';

UPDATE critical_infrastructure SET route_coordinates = '[[-15.00,40.50],[-14.50,40.80],[-13.50,40.60]]'
WHERE name = 'Mozambique-Tanzania LNG Route (Coral FLNG)';

-- ============================================================
-- NIGERIA PIPELINES
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[5.50,5.50],[5.80,5.00],[6.00,4.50],[6.20,4.00],[6.50,3.80],[6.50,3.50]]'
WHERE name = 'Niger Delta Oil Pipeline Network (NNPC/Shell)';

-- ============================================================
-- VENEZUELA / ARGENTINA
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[8.50,-63.50],[8.00,-65.00],[7.50,-67.00],[7.00,-68.00],[6.50,-68.50],[6.00,-68.00],[5.50,-67.00],[5.00,-67.00],[4.50,-67.00],[4.00,-67.50],[3.50,-68.00],[3.00,-67.50],[2.50,-67.00],[1.50,-66.50],[0.50,-66.00]]'
WHERE name = 'OPAL Pipeline (Venezuela-Colombia)';

UPDATE critical_infrastructure SET route_coordinates = '[[52.00,-68.00],[50.00,-70.00],[48.00,-68.00],[46.00,-67.00],[44.00,-65.00],[42.00,-64.00],[40.00,-63.00],[38.00,-63.00],[36.00,-63.50],[34.50,-64.00]]'
WHERE name = 'TGS/TGN Gas Pipeline Networks (Argentina)';

UPDATE critical_infrastructure SET route_coordinates = '[[-22.00,-65.50],[-23.00,-65.00],[-24.00,-65.00],[-25.00,-65.50],[-26.00,-65.00],[-27.00,-65.00],[-28.00,-65.50],[-29.00,-66.00],[-30.00,-66.50],[-32.00,-65.50],[-33.50,-65.50],[-34.50,-65.00],[-34.60,-58.50]]'
WHERE name = 'Gasoducto del Norte (Argentina-Bolivia)';

-- ============================================================
-- EGYPT / NORTH AFRICA
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[30.50,31.00],[30.00,32.50],[30.00,33.50],[30.00,34.50],[31.00,34.50],[31.50,34.50],[32.50,34.80],[33.00,35.00]]'
WHERE name = 'Egypt Gas Export Pipeline (GASCO)';

-- ============================================================
-- EASTERN MEDITERRANEAN (EastMed)
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[30.00,34.50],[31.50,33.00],[32.50,32.50],[33.00,34.00],[33.50,35.00],[35.00,35.00],[36.00,35.50],[36.50,34.50],[37.50,35.00],[38.00,36.50],[38.50,37.50],[39.00,39.00],[39.50,40.00],[40.00,40.50],[40.50,41.00],[41.00,42.00],[41.50,42.50]]'
WHERE name = 'EastMed Pipeline (Proposed)';

-- ============================================================
-- GERMANY GAS PIPELINES
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[54.10,13.50],[53.50,13.50],[52.50,13.50],[51.50,14.00],[51.00,15.00],[50.50,15.50],[50.00,16.00],[49.50,17.00],[49.00,18.00],[48.50,19.00],[48.00,19.50]]'
WHERE name = 'EUGAL/OPAL Pipeline (Germany)';

UPDATE critical_infrastructure SET route_coordinates = '[[48.00,16.50],[47.50,15.50],[47.20,15.00],[47.00,14.50]]'
WHERE name = 'WAG Pipeline (West Austria Gas)';

UPDATE critical_infrastructure SET route_coordinates = '[[48.50,15.50],[48.00,14.50],[47.80,14.00],[47.50,13.50],[47.00,13.00],[46.80,12.50],[46.50,12.00],[45.50,11.50],[45.00,11.00],[44.50,10.50],[44.00,10.00],[43.50,10.50]]'
WHERE name = 'TAG Pipeline (Trans-Austria Gas)';

UPDATE critical_infrastructure SET route_coordinates = '[[54.50,23.50],[54.00,24.00],[53.50,24.00],[53.00,24.50],[52.50,24.50],[52.00,23.50],[51.50,23.50]]'
WHERE name = 'GIPL (Gas Interconnection Poland-Lithuania)';

-- Trans-Saharan fix (remove duplicate update from part1 that overwrote)
UPDATE critical_infrastructure SET route_coordinates = '[[6.50,3.50],[7.00,5.00],[8.00,7.50],[9.00,9.00],[10.00,10.00],[11.00,11.00],[12.00,12.00],[13.00,13.50],[14.00,14.50],[15.00,15.00],[16.00,14.50],[17.00,13.50],[18.00,12.00],[20.00,10.00],[22.00,9.50],[24.00,9.00],[26.00,9.00],[28.00,9.50],[30.00,10.00],[31.00,12.00],[31.50,15.00],[31.50,18.00],[31.50,20.00],[30.50,22.00],[30.50,25.00],[30.50,28.50],[31.00,30.50],[31.50,32.50],[36.80,3.00]]'
WHERE name = 'Trans-Saharan Gas Pipeline (TSGP) - Planned';
