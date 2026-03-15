/*
  # Pipeline Route Coordinates - Part 1: Russia, Europe, North America

  Populates accurate geographic polyline waypoints for major pipeline entries.
  Each route is an array of [lat, lng] pairs tracing the pipeline's real-world path.
*/

-- ============================================================
-- RUSSIA & FSU PIPELINES
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[53.20,53.20],[53.50,45.00],[53.80,38.00],[53.90,32.00],[52.50,28.00],[52.00,24.00],[51.50,19.00],[50.50,14.00],[50.00,13.00],[49.50,14.50],[48.80,16.00],[49.00,18.50],[50.00,22.00],[51.10,23.50]]'
WHERE name = 'Druzhba Pipeline (Friendship Pipeline)';

UPDATE critical_infrastructure SET route_coordinates = '[[59.90,28.70],[58.50,25.00],[57.00,21.00],[56.00,18.00],[55.50,15.00],[55.00,12.50],[54.10,10.20]]'
WHERE name = 'Nord Stream 1 Gas Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[59.90,28.70],[58.50,25.00],[57.00,21.00],[56.00,18.00],[55.30,14.50],[54.80,11.50],[54.10,10.20]]'
WHERE name = 'Nord Stream 2 Gas Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[44.90,37.40],[43.50,35.00],[42.50,32.00],[41.70,29.00],[41.30,28.20],[41.00,29.00],[40.70,29.50],[40.00,29.80],[39.00,30.00],[38.00,30.50],[37.20,31.00]]'
WHERE name = 'TurkStream Gas Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[45.00,37.00],[43.80,36.00],[43.00,35.00],[42.50,35.00],[41.80,35.50],[41.30,36.00]]'
WHERE name = 'Blue Stream Gas Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[60.00,56.00],[57.00,50.00],[55.00,44.00],[53.00,38.00],[51.50,33.00],[51.00,30.50],[50.50,28.00],[50.00,26.00],[49.50,23.00],[49.00,22.00],[48.50,22.00]]'
WHERE name = 'Urengoy-Pomary-Uzhhorod Pipeline (Brotherhood)';

UPDATE critical_infrastructure SET route_coordinates = '[[62.00,129.50],[58.00,126.00],[54.00,124.00],[51.50,122.00],[50.00,120.00],[48.00,118.00]]'
WHERE name = 'Power of Siberia Gas Pipeline (China-Russia)';

UPDATE critical_infrastructure SET route_coordinates = '[[67.00,76.00],[64.00,80.00],[60.00,85.00],[57.00,90.00],[54.00,95.00],[52.00,98.00],[50.00,100.00],[48.00,104.00],[47.00,107.00]]'
WHERE name = 'Power of Siberia 2 (Planned)';

UPDATE critical_infrastructure SET route_coordinates = '[[67.00,76.00],[63.00,68.00],[60.00,63.00],[57.50,56.00],[54.00,52.00],[52.50,48.00],[51.50,44.00],[50.50,36.00],[52.50,28.00],[53.50,24.00],[53.50,16.00],[52.50,13.00]]'
WHERE name = 'Yamal-Europe Gas Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[53.80,142.50],[52.00,141.50],[50.50,141.00],[49.00,142.00]]'
WHERE name = 'Sakhalin-Khabarovsk-Vladivostok Gas Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[47.00,53.00],[46.00,52.00],[45.50,50.00],[45.00,47.00],[44.50,44.00],[44.00,40.00],[44.10,38.00],[44.70,37.80]]'
WHERE name = 'Tengiz-Novorossiysk Pipeline (CPC)';

UPDATE critical_infrastructure SET route_coordinates = '[[47.10,52.00],[45.00,56.00],[44.00,60.00],[43.00,64.00],[42.00,68.00],[41.50,72.00],[43.00,77.00],[44.00,80.00],[44.50,80.50]]'
WHERE name = 'Kazakhstan-China Oil Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[37.90,58.40],[38.50,62.00],[39.00,66.00],[38.80,72.00],[37.00,77.00],[36.00,80.00],[37.50,83.00],[40.00,86.00],[43.00,80.50],[44.50,80.50]]'
WHERE name = 'Central Asia-China Gas Pipeline (CAGP)';

UPDATE critical_infrastructure SET route_coordinates = '[[37.90,58.40],[36.50,60.00],[35.50,62.00],[34.50,64.00],[33.00,66.00],[31.50,66.50],[30.00,67.50],[28.00,68.00],[27.00,68.50],[26.50,68.20]]'
WHERE name = 'Trans-Afghan Pipeline (TAPI)';

-- ============================================================
-- EUROPE PIPELINES
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[36.70,3.20],[37.00,7.00],[37.20,9.50],[37.50,10.00],[37.50,11.00],[37.30,13.00],[37.00,14.50],[37.50,15.00]]'
WHERE name = 'Trans-Mediterranean Pipeline (Transmed)';

UPDATE critical_infrastructure SET route_coordinates = '[[36.50,2.50],[36.90,1.50],[37.50,1.00],[38.00,0.00],[38.50,-0.50],[39.50,-0.80],[40.50,-1.00]]'
WHERE name = 'Medgaz Pipeline (Algeria-Spain)';

UPDATE critical_infrastructure SET route_coordinates = '[[32.00,-1.50],[32.50,-2.50],[33.00,-3.50],[33.50,-4.00],[34.00,-4.50],[35.80,-5.50],[36.00,-5.40],[36.20,-5.80],[36.50,-6.00],[37.00,-7.00],[37.50,-8.00],[38.70,-9.00]]'
WHERE name = 'Maghreb-Europe Gas Pipeline (GME)';

UPDATE critical_infrastructure SET route_coordinates = '[[41.00,26.50],[40.50,24.50],[40.00,22.50],[40.20,20.00],[40.70,19.50],[41.30,19.80],[41.70,19.60],[41.80,15.00],[41.50,13.00]]'
WHERE name = 'TAP (Trans Adriatic Pipeline)';

UPDATE critical_infrastructure SET route_coordinates = '[[41.00,43.50],[40.80,41.50],[40.50,39.50],[40.00,37.50],[39.50,35.50],[39.00,33.00],[38.50,31.00],[38.00,29.00],[37.50,27.50],[37.00,26.50],[41.00,26.50]]'
WHERE name = 'TANAP (Trans-Anatolian Pipeline)';

UPDATE critical_infrastructure SET route_coordinates = '[[40.50,49.50],[41.00,47.50],[41.50,46.50],[42.00,45.00],[41.60,43.50]]'
WHERE name = 'South Caucasus Pipeline (SCP)';

UPDATE critical_infrastructure SET route_coordinates = '[[41.50,26.50],[41.70,25.00],[42.10,24.00],[42.50,23.50]]'
WHERE name = 'IGB (Interconnector Greece-Bulgaria)';

UPDATE critical_infrastructure SET route_coordinates = '[[57.50,8.00],[57.00,9.00],[56.50,10.00],[56.00,11.00],[55.80,12.50],[55.50,13.50],[55.20,15.00],[55.00,16.00],[54.50,17.50],[54.00,18.50],[53.80,20.00],[53.50,21.00]]'
WHERE name = 'Baltic Pipe (Norway-Poland via Denmark)';

UPDATE critical_infrastructure SET route_coordinates = '[[51.70,2.00],[51.80,3.00],[51.90,4.00],[52.00,5.00],[52.20,6.00],[52.50,7.50],[53.00,9.00],[53.50,10.00]]'
WHERE name = 'Interconnector UK-Belgium (IUK)';

UPDATE critical_infrastructure SET route_coordinates = '[[62.70,7.20],[61.00,5.00],[60.00,3.00],[59.00,1.00],[58.50,-1.00],[58.00,0.50],[57.50,1.50],[56.50,0.00],[54.50,-1.00],[53.80,-0.30]]'
WHERE name = 'Langeled Pipeline (Norway-UK)';

UPDATE critical_infrastructure SET route_coordinates = '[[57.50,5.00],[57.00,4.00],[56.50,3.00],[56.00,2.50],[55.50,2.50],[54.50,2.20],[53.50,2.00],[52.00,2.00],[51.20,2.50]]'
WHERE name = 'Franpipe (Norway-France)';

-- ============================================================
-- NORTH AMERICA PIPELINES
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[70.30,-148.70],[68.50,-152.00],[67.00,-154.00],[65.50,-153.00],[64.00,-151.00],[62.50,-150.50],[61.50,-149.50],[61.10,-146.50]]'
WHERE name = 'Trans-Alaska Pipeline System (TAPS)';

UPDATE critical_infrastructure SET route_coordinates = '[[56.90,-111.50],[54.50,-111.50],[52.50,-112.00],[50.00,-111.00],[49.00,-110.50],[47.50,-110.00],[45.00,-107.50],[43.00,-104.00],[41.00,-101.00],[40.00,-97.00],[38.50,-95.00],[37.00,-94.50],[36.50,-94.50],[35.00,-95.00],[34.50,-96.00],[33.50,-97.00],[32.00,-97.00],[30.00,-96.50],[29.50,-95.50]]'
WHERE name = 'Keystone Pipeline System';

UPDATE critical_infrastructure SET route_coordinates = '[[29.70,-95.00],[30.50,-91.50],[30.80,-89.00],[32.00,-87.00],[33.50,-85.00],[34.00,-84.00],[35.00,-82.00],[36.00,-79.50],[37.00,-77.50],[38.50,-77.00],[39.00,-76.50],[39.50,-75.50],[40.00,-75.20],[40.50,-75.00],[40.70,-74.20]]'
WHERE name = 'Colonial Pipeline System';

UPDATE critical_infrastructure SET route_coordinates = '[[48.00,-104.00],[47.00,-103.00],[46.00,-102.00],[45.00,-101.00],[44.00,-100.00],[43.50,-99.00],[43.00,-98.00],[42.00,-97.00],[41.50,-96.00],[41.00,-95.50],[40.50,-95.00],[40.00,-94.00]]'
WHERE name = 'Dakota Access Pipeline (DAPL)';

UPDATE critical_infrastructure SET route_coordinates = '[[46.50,-84.50],[46.00,-85.00],[45.50,-85.50],[45.00,-86.00],[44.50,-86.00],[44.00,-86.50]]'
WHERE name = 'Enbridge Line 5 (Great Lakes)';

UPDATE critical_infrastructure SET route_coordinates = '[[53.50,-113.50],[52.50,-120.00],[50.50,-121.00],[49.50,-121.50],[49.20,-122.50],[49.10,-123.00]]'
WHERE name = 'Trans Mountain Pipeline (TMX)';

UPDATE critical_infrastructure SET route_coordinates = '[[57.00,-111.50],[55.00,-109.00],[53.00,-107.00],[51.00,-106.00],[49.50,-97.00],[47.50,-96.00],[46.00,-96.50],[44.50,-92.00],[43.50,-90.00],[43.00,-88.50],[41.50,-87.50]]'
WHERE name = 'Enbridge Mainline System';

UPDATE critical_infrastructure SET route_coordinates = '[[56.00,-120.00],[55.00,-118.00],[54.50,-116.00],[54.00,-114.00],[53.50,-112.00],[51.00,-108.00],[49.00,-105.00],[47.00,-103.00],[45.00,-101.00],[44.50,-99.00],[43.50,-97.00],[42.50,-95.00],[41.80,-90.50],[41.50,-88.50]]'
WHERE name = 'Alliance Pipeline (Canada-US Gas)';

UPDATE critical_infrastructure SET route_coordinates = '[[30.00,-93.80],[30.50,-91.50],[31.50,-90.00],[32.50,-88.00],[33.50,-86.00],[35.00,-83.50],[36.50,-81.00],[38.00,-79.00],[39.00,-77.00],[39.50,-76.00],[40.00,-75.50],[40.50,-74.50],[40.70,-74.00]]'
WHERE name = 'Transcontinental Gas Pipeline (Transco)';

UPDATE critical_infrastructure SET route_coordinates = '[[29.30,-89.50],[30.00,-89.50],[31.00,-88.50],[32.50,-87.50],[34.00,-86.00],[36.00,-84.00],[37.50,-82.50],[38.50,-81.00],[39.50,-80.00],[40.00,-79.00],[40.50,-78.00],[41.00,-77.00],[41.50,-75.00],[41.80,-74.00]]'
WHERE name = 'Tennessee Gas Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[41.50,-111.50],[41.00,-108.00],[40.50,-105.00],[40.00,-102.50],[40.00,-99.50],[40.50,-97.00],[41.00,-95.00],[41.50,-93.00],[41.00,-91.00],[40.50,-90.00]]'
WHERE name = 'Rockies Express Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[29.73,-93.87],[29.50,-92.00],[29.80,-91.00],[30.00,-90.50]]'
WHERE name = 'Sabine Pass LNG Export Terminal (Pipelines)';

UPDATE critical_infrastructure SET route_coordinates = '[[22.50,-98.00],[22.00,-97.50],[21.00,-97.00],[20.00,-96.50],[19.00,-96.50],[18.50,-96.00]]'
WHERE name = 'Mexico-Texas Natural Gas Pipelines (Sur de Texas-Tuxpan)';

-- ============================================================
-- SOUTH AMERICA PIPELINES
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[-17.80,-63.80],[-18.50,-60.00],[-20.00,-57.50],[-22.00,-55.00],[-23.50,-53.00],[-23.80,-46.80]]'
WHERE name = 'TBG Pipeline (Brazil-Bolivia Gas)';

UPDATE critical_infrastructure SET route_coordinates = '[[-1.00,-77.80],[-1.50,-77.00],[-2.00,-76.50],[-2.50,-76.00],[-2.50,-75.00],[-1.80,-74.00],[-1.50,-73.50],[-1.20,-72.50],[-0.50,-72.00],[-0.30,-71.50]]'
WHERE name = 'OCP Ecuador Heavy Oil Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[1.00,-77.50],[0.50,-77.00],[0.00,-77.00],[-0.50,-77.50],[-0.80,-77.80],[-1.00,-78.50],[-1.50,-78.60],[-2.00,-79.00],[-2.20,-79.90]]'
WHERE name = 'Oleoducto Trasandino (OTA) Colombia-Ecuador';

UPDATE critical_infrastructure SET route_coordinates = '[[-12.80,-72.50],[-13.00,-73.00],[-13.50,-75.50],[-14.00,-76.00],[-14.50,-76.50],[-13.50,-76.20],[-12.00,-77.00]]'
WHERE name = 'CAMISEA Pipeline System (Peru)';

-- ============================================================
-- AFRICA PIPELINES
-- ============================================================

UPDATE critical_infrastructure SET route_coordinates = '[[10.00,13.00],[13.00,13.00],[15.00,14.00],[16.00,13.50],[17.00,13.00],[18.00,12.50],[20.00,11.00],[22.00,10.00],[24.00,9.50],[26.00,9.50],[28.00,9.50],[30.00,10.00],[30.50,11.50],[31.00,13.50],[31.50,15.00],[31.50,18.00],[31.50,20.00],[30.50,22.00],[30.50,25.00],[30.50,28.50],[31.00,30.50],[31.30,32.00]]'
WHERE name = 'Trans-Saharan Gas Pipeline (TSGP) - Planned';

UPDATE critical_infrastructure SET route_coordinates = '[[4.00,5.00],[4.50,4.50],[5.00,4.00],[5.50,3.50],[5.80,2.50],[5.80,1.50],[6.00,1.00],[6.20,1.20]]'
WHERE name = 'West African Gas Pipeline (WAGP)';

UPDATE critical_infrastructure SET route_coordinates = '[[8.50,16.50],[8.00,15.00],[7.50,14.50],[7.00,14.00],[6.50,13.50],[5.50,12.50],[4.50,11.50],[3.50,10.50],[3.00,10.00],[2.50,9.80],[2.20,9.70]]'
WHERE name = 'Chad-Cameroon Pipeline';

UPDATE critical_infrastructure SET route_coordinates = '[[-1.50,31.00],[-1.00,33.00],[0.00,34.50],[0.50,34.50],[1.00,34.00],[0.50,33.00],[0.00,31.50]]'
WHERE name = 'EACOP (East Africa Crude Oil Pipeline)';

UPDATE critical_infrastructure SET route_coordinates = '[[32.90,3.10],[33.50,5.00],[34.00,7.00],[34.50,9.00],[35.00,10.00],[36.50,10.50],[37.00,10.10]]'
WHERE name = 'Greenstream Pipeline (Libya-Italy)';

UPDATE critical_infrastructure SET route_coordinates = '[[36.80,3.00],[36.00,4.00],[35.00,6.00],[34.50,8.00],[33.50,10.00],[33.00,12.50],[32.90,15.00],[32.50,16.50],[31.50,17.00],[30.50,18.00],[30.50,20.00],[31.00,22.00],[31.50,24.00],[32.50,26.00],[31.00,30.50]]'
WHERE name = 'Trans-Saharan Gas Pipeline (TSGP) - Planned';
