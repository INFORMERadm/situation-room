/*
  # Add Worldwide Military Bases

  1. Changes
    - Inserts military bases for all major world powers and regional forces
    - Covers: NATO (US, UK, France, Germany, Italy, Turkey, Canada, Spain, Netherlands, Poland, Norway, Belgium, Denmark, Greece, Portugal),
      Russia, China, India, Pakistan, North Korea, South Korea, Japan, Australia, Brazil, Egypt, Saudi Arabia, UAE, 
      and other significant military nations
    - All bases inserted with is_active = true
    - Each base includes name, country, operator, base_type, coordinates, description, and equipment where known

  2. Important Notes
    - Uses ON CONFLICT DO NOTHING to avoid duplicating existing bases
    - Coordinates are approximate public-domain locations
    - Only includes major/well-known installations
*/

INSERT INTO military_bases (name, country, operator, base_type, latitude, longitude, description, equipment, is_active) VALUES

-- =============================================
-- UNITED STATES (Continental & Overseas)
-- =============================================
('Ramstein Air Base', 'Germany', 'US Air Force', 'air_base', 49.4369, 7.6003, 'USAFE headquarters and major NATO air hub in Europe', '[{"type":"F-16","category":"fighter","quantity":48},{"type":"C-130J","category":"transport","quantity":14}]'::jsonb, true),
('Aviano Air Base', 'Italy', 'US Air Force', 'air_base', 46.0319, 12.5965, 'US Air Force base in northeastern Italy supporting European operations', '[{"type":"F-16","category":"fighter","quantity":42}]'::jsonb, true),
('Incirlik Air Base', 'Turkey', 'US Air Force', 'air_base', 37.0020, 35.4259, 'Strategic US/NATO air base in southern Turkey', '[{"type":"B-61 Nuclear Storage","category":"nuclear","quantity":50}]'::jsonb, true),
('Naval Station Rota', 'Spain', 'US Navy', 'naval_base', 36.6261, -6.3500, 'US Naval Station supporting Aegis BMD destroyers in Europe', '[{"type":"Arleigh Burke DDG","category":"destroyer","quantity":4}]'::jsonb, true),
('Naval Station Norfolk', 'United States', 'US Navy', 'naval_base', 36.9461, -76.3033, 'Largest naval base in the world, homeport of US Atlantic Fleet', '[{"type":"Aircraft Carriers","category":"carrier","quantity":5},{"type":"Destroyers","category":"destroyer","quantity":30}]'::jsonb, true),
('Naval Base San Diego', 'United States', 'US Navy', 'naval_base', 32.6837, -117.1293, 'Major Pacific Fleet homeport', '[{"type":"Aircraft Carriers","category":"carrier","quantity":3},{"type":"Destroyers","category":"destroyer","quantity":25}]'::jsonb, true),
('Joint Base Pearl Harbor-Hickam', 'United States', 'US Navy', 'naval_base', 21.3469, -157.9397, 'US Pacific Fleet headquarters', '[{"type":"Submarines","category":"submarine","quantity":18},{"type":"Destroyers","category":"destroyer","quantity":10}]'::jsonb, true),
('Naval Station Guantanamo Bay', 'Cuba', 'US Navy', 'naval_base', 19.9023, -75.0961, 'US Naval Station in Cuba', '[]'::jsonb, true),
('Camp Humphreys', 'South Korea', 'US Army', 'mixed', 36.9628, 127.0316, 'Largest overseas US military base, USFK headquarters', '[{"type":"Apache AH-64","category":"helicopter","quantity":24},{"type":"Patriot","category":"missile_defense","quantity":6}]'::jsonb, true),
('Osan Air Base', 'South Korea', 'US Air Force', 'air_base', 37.0900, 127.0300, '7th Air Force headquarters in South Korea', '[{"type":"F-16","category":"fighter","quantity":36},{"type":"A-10","category":"attack","quantity":24}]'::jsonb, true),
('Kadena Air Base', 'Japan', 'US Air Force', 'air_base', 26.3516, 127.7669, 'Largest US air base in the Pacific', '[{"type":"F-15C/D","category":"fighter","quantity":48},{"type":"KC-135","category":"tanker","quantity":15}]'::jsonb, true),
('Yokota Air Base', 'Japan', 'US Air Force', 'air_base', 35.7485, 139.3485, 'USFJ and 5th Air Force headquarters', '[{"type":"C-130J","category":"transport","quantity":10},{"type":"CV-22 Osprey","category":"tiltrotor","quantity":5}]'::jsonb, true),
('Naval Air Facility Atsugi', 'Japan', 'US Navy', 'air_base', 35.4546, 139.4504, 'US naval air facility near Tokyo', '[{"type":"P-8 Poseidon","category":"patrol","quantity":12}]'::jsonb, true),
('MCAS Iwakuni', 'Japan', 'US Marines', 'air_base', 34.1464, 132.2361, 'Marine Corps Air Station in western Japan', '[{"type":"F-35B","category":"fighter","quantity":16},{"type":"F/A-18","category":"fighter","quantity":12}]'::jsonb, true),
('Camp Pendleton', 'United States', 'US Marines', 'mixed', 33.3014, -117.3731, 'Major west coast Marine Corps base', '[{"type":"LAV-25","category":"armored","quantity":50}]'::jsonb, true),
('Fort Bragg (Fort Liberty)', 'United States', 'US Army', 'mixed', 35.1390, -79.0064, 'Home of XVIII Airborne Corps and US Army Special Operations', '[{"type":"82nd Airborne","category":"infantry","quantity":1}]'::jsonb, true),
('Nellis Air Force Base', 'United States', 'US Air Force', 'air_base', 36.2360, -115.0343, 'USAF Warfare Center, home of Red Flag exercises', '[{"type":"F-35A","category":"fighter","quantity":30},{"type":"F-16","category":"fighter","quantity":60}]'::jsonb, true),
('Edwards Air Force Base', 'United States', 'US Air Force', 'air_base', 34.9054, -117.8839, 'Air Force Test Center', '[{"type":"Test Aircraft","category":"experimental","quantity":25}]'::jsonb, true),
('Naval Submarine Base Kings Bay', 'United States', 'US Navy', 'naval_base', 30.7955, -81.5658, 'East Coast Trident SSBN base', '[{"type":"Ohio-class SSBN","category":"submarine","quantity":6}]'::jsonb, true),
('Naval Base Kitsap', 'United States', 'US Navy', 'naval_base', 47.5648, -122.6264, 'West Coast Trident SSBN base', '[{"type":"Ohio-class SSBN","category":"submarine","quantity":8}]'::jsonb, true),
('Diego Garcia', 'British Indian Ocean Territory', 'US Navy', 'mixed', -7.3133, 72.4111, 'Strategic US/UK military facility in the Indian Ocean', '[{"type":"B-52","category":"bomber","quantity":6},{"type":"B-2","category":"bomber","quantity":3}]'::jsonb, true),
('Thule Air Base', 'Greenland', 'US Space Force', 'radar', 76.5312, -68.7031, 'Northernmost US base, ballistic missile early warning', '[{"type":"AN/FPS-132","category":"radar","quantity":1}]'::jsonb, true),
('Whiteman Air Force Base', 'United States', 'US Air Force', 'air_base', 38.7301, -93.5479, 'Home of the B-2 Spirit stealth bomber fleet', '[{"type":"B-2 Spirit","category":"bomber","quantity":20}]'::jsonb, true),
('Minot Air Force Base', 'United States', 'US Air Force', 'air_base', 48.4157, -101.3581, 'B-52 and Minuteman III ICBM base', '[{"type":"B-52H","category":"bomber","quantity":28},{"type":"Minuteman III","category":"icbm","quantity":150}]'::jsonb, true),

-- =============================================
-- RUSSIA
-- =============================================
('Kaliningrad Naval Base', 'Russia', 'Russian Navy', 'naval_base', 54.7104, 20.5101, 'Baltic Fleet headquarters', '[{"type":"Corvettes","category":"warship","quantity":8},{"type":"Submarines","category":"submarine","quantity":2}]'::jsonb, true),
('Severomorsk Naval Base', 'Russia', 'Russian Navy', 'naval_base', 69.0733, 33.4168, 'Northern Fleet headquarters, major nuclear submarine base', '[{"type":"Borei-class SSBN","category":"submarine","quantity":4},{"type":"Kirov-class BC","category":"battlecruiser","quantity":1}]'::jsonb, true),
('Vladivostok Naval Base', 'Russia', 'Russian Navy', 'naval_base', 43.1155, 131.8855, 'Pacific Fleet headquarters', '[{"type":"Slava-class Cruiser","category":"cruiser","quantity":1},{"type":"Submarines","category":"submarine","quantity":8}]'::jsonb, true),
('Engels Air Base', 'Russia', 'Russian Air Force', 'air_base', 51.4800, 46.2000, 'Strategic bomber base for Tu-160 and Tu-95', '[{"type":"Tu-160","category":"bomber","quantity":16},{"type":"Tu-95MS","category":"bomber","quantity":20}]'::jsonb, true),
('Kubinka Air Base', 'Russia', 'Russian Air Force', 'air_base', 55.6033, 36.6500, 'Home of Russian Knights and Swifts aerobatic teams, military testing', '[{"type":"Su-35","category":"fighter","quantity":12},{"type":"Su-57","category":"fighter","quantity":6}]'::jsonb, true),
('Plesetsk Cosmodrome', 'Russia', 'Russian Space Forces', 'missile_defense', 62.9269, 40.5767, 'ICBM and space launch facility', '[{"type":"RS-28 Sarmat","category":"icbm","quantity":10},{"type":"Topol-M","category":"icbm","quantity":18}]'::jsonb, true),
('Voronezh Radar Station', 'Russia', 'Russian Aerospace Forces', 'radar', 52.8700, 40.0800, 'Over-the-horizon missile early warning radar', '[{"type":"Voronezh-DM","category":"radar","quantity":1}]'::jsonb, true),
('Novorossiysk Naval Base', 'Russia', 'Russian Navy', 'naval_base', 44.7233, 37.7681, 'Black Sea Fleet secondary base', '[{"type":"Kilo-class Submarine","category":"submarine","quantity":6},{"type":"Frigates","category":"frigate","quantity":3}]'::jsonb, true),
('Cam Ranh Bay', 'Vietnam', 'Russian Navy', 'naval_base', 11.9515, 109.2224, 'Russian naval logistics facility in Vietnam', '[]'::jsonb, true),
('Khmeimim/Latakia Expansion', 'Syria', 'Russian Air Force', 'air_base', 35.4131, 35.9481, 'Russian forward operating base with Su-35 and Su-34 aircraft', '[{"type":"Su-35S","category":"fighter","quantity":6},{"type":"Su-34","category":"bomber","quantity":4},{"type":"S-400","category":"sam","quantity":2}]'::jsonb, true),
('Gadzhiyevo Naval Base', 'Russia', 'Russian Navy', 'naval_base', 69.2519, 33.3255, 'Northern Fleet SSBN base', '[{"type":"Delta IV SSBN","category":"submarine","quantity":5},{"type":"Borei-class SSBN","category":"submarine","quantity":3}]'::jsonb, true),
('Dombarovsky Air Base', 'Russia', 'Russian Strategic Rocket Forces', 'missile_defense', 50.7870, 59.5349, 'ICBM base for RS-28 Sarmat', '[{"type":"RS-28 Sarmat","category":"icbm","quantity":6}]'::jsonb, true),

-- =============================================
-- CHINA (PLA)
-- =============================================
('Yulin Naval Base', 'China', 'PLA Navy', 'naval_base', 18.2265, 109.5525, 'South Sea Fleet submarine base on Hainan Island with underground pens', '[{"type":"Type 094 SSBN","category":"submarine","quantity":6},{"type":"Type 093 SSN","category":"submarine","quantity":4}]'::jsonb, true),
('Zhanjiang Naval Base', 'China', 'PLA Navy', 'naval_base', 21.2000, 110.4000, 'South Sea Fleet headquarters', '[{"type":"Type 052D Destroyer","category":"destroyer","quantity":6},{"type":"Type 054A Frigate","category":"frigate","quantity":8}]'::jsonb, true),
('Qingdao Naval Base', 'China', 'PLA Navy', 'naval_base', 36.0676, 120.3828, 'North Sea Fleet headquarters', '[{"type":"Type 055 Destroyer","category":"destroyer","quantity":4},{"type":"Liaoning CV-16","category":"carrier","quantity":1}]'::jsonb, true),
('Ningbo Naval Base', 'China', 'PLA Navy', 'naval_base', 29.8683, 121.5440, 'East Sea Fleet headquarters', '[{"type":"Type 052D Destroyer","category":"destroyer","quantity":4},{"type":"Type 054A Frigate","category":"frigate","quantity":6}]'::jsonb, true),
('Fiery Cross Reef', 'South China Sea', 'PLA Military', 'mixed', 9.5500, 112.8900, 'Artificial island military outpost with airstrip, radar, and missile systems', '[{"type":"HQ-9","category":"sam","quantity":2},{"type":"YJ-12B","category":"anti_ship","quantity":4}]'::jsonb, true),
('Subi Reef', 'South China Sea', 'PLA Military', 'mixed', 10.9200, 114.0800, 'Artificial island with radar arrays and hangars', '[{"type":"Radar Systems","category":"radar","quantity":4}]'::jsonb, true),
('Mischief Reef', 'South China Sea', 'PLA Military', 'mixed', 9.9000, 115.5300, 'Artificial island with runway and weapons systems', '[{"type":"CIWS","category":"defense","quantity":4}]'::jsonb, true),
('Djibouti Support Base', 'Djibouti', 'PLA Military', 'mixed', 11.5375, 43.1326, 'China first overseas military base', '[{"type":"Armored Vehicles","category":"armored","quantity":10}]'::jsonb, true),
('Korla Missile Test Range', 'China', 'PLA Rocket Force', 'missile_defense', 41.7560, 86.1293, 'PLA missile testing and anti-ballistic missile development', '[{"type":"DF-21D","category":"anti_ship_ballistic","quantity":12}]'::jsonb, true),
('Delingha Missile Base', 'China', 'PLA Rocket Force', 'missile_defense', 37.3700, 97.3700, 'ICBM base for DF-41 missiles', '[{"type":"DF-41","category":"icbm","quantity":12}]'::jsonb, true),
('Chengdu Air Base', 'China', 'PLA Air Force', 'air_base', 30.5785, 104.0665, 'J-20 stealth fighter development and deployment base', '[{"type":"J-20","category":"fighter","quantity":24}]'::jsonb, true),
('Wuhan Air Base', 'China', 'PLA Air Force', 'air_base', 30.5176, 114.2131, 'Strategic bomber base', '[{"type":"H-6K","category":"bomber","quantity":20}]'::jsonb, true),
('Hotan Air Base', 'China', 'PLA Air Force', 'air_base', 37.0384, 79.8651, 'Western frontier air defense base near India border', '[{"type":"J-11","category":"fighter","quantity":24}]'::jsonb, true),

-- =============================================
-- INDIA
-- =============================================
('INS Kadamba (Karwar)', 'India', 'Indian Navy', 'naval_base', 14.8025, 74.1240, 'India largest naval base on the western coast', '[{"type":"INS Vikramaditya","category":"carrier","quantity":1},{"type":"Shivalik Frigates","category":"frigate","quantity":3}]'::jsonb, true),
('Visakhapatnam Naval Base', 'India', 'Indian Navy', 'naval_base', 17.7015, 83.3030, 'Eastern Naval Command headquarters, submarine base', '[{"type":"Arihant-class SSBN","category":"submarine","quantity":2},{"type":"Kilo-class","category":"submarine","quantity":4}]'::jsonb, true),
('Mumbai Naval Dockyard', 'India', 'Indian Navy', 'naval_base', 18.9282, 72.8435, 'Western Naval Command headquarters', '[{"type":"Kolkata-class DDG","category":"destroyer","quantity":3}]'::jsonb, true),
('Ambala Air Force Station', 'India', 'Indian Air Force', 'air_base', 30.3665, 76.8174, 'First Rafale fighter squadron base', '[{"type":"Rafale","category":"fighter","quantity":18},{"type":"Jaguar","category":"strike","quantity":20}]'::jsonb, true),
('Gwalior Air Force Station', 'India', 'Indian Air Force', 'air_base', 26.2934, 78.2278, 'Mirage 2000 operations base', '[{"type":"Mirage 2000","category":"fighter","quantity":36}]'::jsonb, true),
('Hasimara Air Force Station', 'India', 'Indian Air Force', 'air_base', 26.6893, 89.3684, 'Rafale deployment near Chinese border', '[{"type":"Rafale","category":"fighter","quantity":18}]'::jsonb, true),
('Agra Strategic Forces Command', 'India', 'Indian Strategic Forces', 'missile_defense', 27.1556, 78.0133, 'Agni missile operations base', '[{"type":"Agni-V","category":"icbm","quantity":12},{"type":"Agni-III","category":"irbm","quantity":8}]'::jsonb, true),
('INS Rajali (Arakkonam)', 'India', 'Indian Navy', 'air_base', 13.0722, 79.6825, 'Naval air station for P-8I maritime patrol', '[{"type":"P-8I Neptune","category":"patrol","quantity":12}]'::jsonb, true),
('Leh Air Force Station', 'India', 'Indian Air Force', 'air_base', 34.1359, 77.5465, 'High-altitude air base near China/Pakistan borders', '[{"type":"MiG-29","category":"fighter","quantity":12},{"type":"Apache AH-64","category":"helicopter","quantity":6}]'::jsonb, true),

-- =============================================
-- PAKISTAN
-- =============================================
('Kamra Air Complex', 'Pakistan', 'Pakistan Air Force', 'air_base', 33.8690, 72.4013, 'Pakistan Aeronautical Complex and JF-17 production', '[{"type":"JF-17","category":"fighter","quantity":50},{"type":"F-16","category":"fighter","quantity":18}]'::jsonb, true),
('Masroor Air Base', 'Pakistan', 'Pakistan Air Force', 'air_base', 24.8937, 66.9386, 'Southern Air Command base near Karachi', '[{"type":"JF-17","category":"fighter","quantity":24},{"type":"Mirage III","category":"fighter","quantity":12}]'::jsonb, true),
('Sargodha Air Base', 'Pakistan', 'Pakistan Air Force', 'air_base', 32.0488, 72.6651, 'Central air defense base', '[{"type":"F-16","category":"fighter","quantity":18}]'::jsonb, true),
('PNS Jinnah (Ormara)', 'Pakistan', 'Pakistan Navy', 'naval_base', 25.2742, 64.6354, 'Western naval base', '[{"type":"Agosta 90B Submarine","category":"submarine","quantity":3}]'::jsonb, true),
('Gwadar Naval Base', 'Pakistan', 'Pakistan Navy', 'naval_base', 25.1264, 62.3225, 'Strategic deep-water port with Chinese support', '[]'::jsonb, true),

-- =============================================
-- NORTH KOREA
-- =============================================
('Wonsan Naval Base', 'North Korea', 'Korean People Navy', 'naval_base', 39.1526, 127.4439, 'Major east coast naval base', '[{"type":"Romeo-class Submarine","category":"submarine","quantity":20}]'::jsonb, true),
('Sunchon Air Base', 'North Korea', 'Korean People Air Force', 'air_base', 39.4150, 125.8960, 'Home of MiG-29 fighter regiment', '[{"type":"MiG-29","category":"fighter","quantity":18}]'::jsonb, true),
('Yongbyon Nuclear Complex', 'North Korea', 'Korean People Army', 'mixed', 39.7965, 125.7577, 'Primary nuclear weapons facility', '[{"type":"Nuclear Reactor","category":"nuclear","quantity":2}]'::jsonb, true),
('Kusong Missile Base', 'North Korea', 'Korean People Army', 'missile_defense', 39.6600, 125.0700, 'Hwasong ICBM launch facility', '[{"type":"Hwasong-15","category":"icbm","quantity":6}]'::jsonb, true),
('Nampo Naval Base', 'North Korea', 'Korean People Navy', 'naval_base', 38.7372, 125.4078, 'West coast fleet headquarters', '[{"type":"Patrol Boats","category":"patrol","quantity":30}]'::jsonb, true),

-- =============================================
-- SOUTH KOREA
-- =============================================
('Jinhae Naval Base', 'South Korea', 'ROK Navy', 'naval_base', 35.1336, 128.6660, 'ROK Navy fleet headquarters', '[{"type":"KDX-III Aegis DDG","category":"destroyer","quantity":3},{"type":"Type 214 Submarine","category":"submarine","quantity":9}]'::jsonb, true),
('Cheongju Air Base', 'South Korea', 'ROK Air Force', 'air_base', 36.7166, 127.4953, 'F-35A Lightning II deployment base', '[{"type":"F-35A","category":"fighter","quantity":40}]'::jsonb, true),
('Gwangju Air Base', 'South Korea', 'ROK Air Force', 'air_base', 35.1128, 126.8076, 'KF-21 Boramae deployment base', '[{"type":"KF-21","category":"fighter","quantity":20},{"type":"FA-50","category":"fighter","quantity":20}]'::jsonb, true),
('THAAD Battery Seongju', 'South Korea', 'US/ROK', 'missile_defense', 35.9000, 128.1500, 'THAAD anti-ballistic missile defense site', '[{"type":"THAAD","category":"missile_defense","quantity":1}]'::jsonb, true),

-- =============================================
-- JAPAN (JSDF)
-- =============================================
('Yokosuka Naval Base', 'Japan', 'JMSDF / US Navy', 'naval_base', 35.2838, 139.6543, 'US 7th Fleet homeport and JMSDF base', '[{"type":"USS Ronald Reagan CVN","category":"carrier","quantity":1},{"type":"Izumo-class CVL","category":"carrier","quantity":1}]'::jsonb, true),
('Kure Naval Base', 'Japan', 'JMSDF', 'naval_base', 34.2382, 132.5647, 'JMSDF fleet base in western Japan', '[{"type":"Maya-class DDG","category":"destroyer","quantity":2}]'::jsonb, true),
('Misawa Air Base', 'Japan', 'JASDF / US Air Force', 'air_base', 40.7032, 141.3687, 'Joint US-Japan air base in northern Honshu', '[{"type":"F-35A","category":"fighter","quantity":18},{"type":"F-16","category":"fighter","quantity":36}]'::jsonb, true),
('Nyutabaru Air Base', 'Japan', 'JASDF', 'air_base', 32.0836, 131.4513, 'JASDF F-15J fighter base on Kyushu', '[{"type":"F-15J","category":"fighter","quantity":24}]'::jsonb, true),
('Naha Air Base', 'Japan', 'JASDF', 'air_base', 26.1958, 127.6459, 'JASDF southwestern air defense, Okinawa', '[{"type":"F-15J","category":"fighter","quantity":40}]'::jsonb, true),

-- =============================================
-- AUSTRALIA
-- =============================================
('HMAS Stirling', 'Australia', 'Royal Australian Navy', 'naval_base', -32.2371, 115.6859, 'Fleet Base West, main submarine base', '[{"type":"Collins-class Submarine","category":"submarine","quantity":6}]'::jsonb, true),
('RAAF Amberley', 'Australia', 'Royal Australian Air Force', 'air_base', -27.6330, 152.7116, 'F-35A and strategic strike base', '[{"type":"F-35A","category":"fighter","quantity":33},{"type":"F/A-18F","category":"fighter","quantity":24}]'::jsonb, true),
('RAAF Tindal', 'Australia', 'Royal Australian Air Force', 'air_base', -14.5214, 132.3781, 'Northern Australia forward operating base, joint US operations', '[{"type":"F-35A","category":"fighter","quantity":24}]'::jsonb, true),
('Pine Gap', 'Australia', 'US/Australian Intelligence', 'radar', -23.7990, 133.7370, 'Joint US-Australian satellite ground station and signals intelligence', '[{"type":"Satellite Dishes","category":"sigint","quantity":14}]'::jsonb, true),
('HMAS Coonawarra (Darwin)', 'Australia', 'Royal Australian Navy', 'naval_base', -12.4533, 130.8455, 'Northern naval base supporting Indo-Pacific operations', '[{"type":"Patrol Boats","category":"patrol","quantity":6}]'::jsonb, true),

-- =============================================
-- UNITED KINGDOM
-- =============================================
('HMNB Portsmouth', 'United Kingdom', 'Royal Navy', 'naval_base', 50.7996, -1.1070, 'Home of the Royal Navy aircraft carriers', '[{"type":"Queen Elizabeth-class CVF","category":"carrier","quantity":2},{"type":"Type 45 Destroyer","category":"destroyer","quantity":3}]'::jsonb, true),
('HMNB Clyde (Faslane)', 'United Kingdom', 'Royal Navy', 'naval_base', 56.0676, -4.8199, 'Trident SSBN base and submarine headquarters', '[{"type":"Vanguard-class SSBN","category":"submarine","quantity":4},{"type":"Astute-class SSN","category":"submarine","quantity":4}]'::jsonb, true),
('RAF Coningsby', 'United Kingdom', 'Royal Air Force', 'air_base', 53.0932, -0.1663, 'Typhoon fighter base and QRA North', '[{"type":"Typhoon FGR.4","category":"fighter","quantity":36}]'::jsonb, true),
('RAF Lossiemouth', 'United Kingdom', 'Royal Air Force', 'air_base', 57.7052, -3.3392, 'Typhoon and P-8A Poseidon maritime patrol', '[{"type":"Typhoon","category":"fighter","quantity":36},{"type":"P-8A Poseidon","category":"patrol","quantity":9}]'::jsonb, true),
('RAF Marham', 'United Kingdom', 'Royal Air Force', 'air_base', 52.6484, 0.5505, 'F-35B Lightning II base', '[{"type":"F-35B","category":"fighter","quantity":24}]'::jsonb, true),
('RAF Lakenheath', 'United Kingdom', 'US Air Force', 'air_base', 52.4093, 0.5610, 'USAFE F-15 and F-35 base in UK', '[{"type":"F-15E","category":"fighter","quantity":48},{"type":"F-35A","category":"fighter","quantity":24}]'::jsonb, true),
('RAF Mildenhall', 'United Kingdom', 'US Air Force', 'air_base', 52.3613, 0.4863, 'USAFE aerial refueling and special operations', '[{"type":"KC-135","category":"tanker","quantity":15}]'::jsonb, true),
('RAF Waddington', 'United Kingdom', 'Royal Air Force', 'air_base', 53.1662, -0.5238, 'ISTAR and Protector RPA operations', '[{"type":"Protector RG.1","category":"uav","quantity":16}]'::jsonb, true),

-- =============================================
-- FRANCE
-- =============================================
('Toulon Naval Base', 'France', 'French Navy', 'naval_base', 43.1009, 5.9280, 'French Mediterranean Fleet HQ and carrier base', '[{"type":"Charles de Gaulle CVN","category":"carrier","quantity":1},{"type":"FREMM Frigate","category":"frigate","quantity":4}]'::jsonb, true),
('Brest Naval Base', 'France', 'French Navy', 'naval_base', 48.3834, -4.4953, 'Atlantic Fleet and SSBN base', '[{"type":"Le Triomphant-class SSBN","category":"submarine","quantity":4},{"type":"Suffren-class SSN","category":"submarine","quantity":2}]'::jsonb, true),
('BA 113 Saint-Dizier', 'France', 'French Air Force', 'air_base', 48.6361, 4.8992, 'Rafale nuclear strike base', '[{"type":"Rafale","category":"fighter","quantity":40},{"type":"ASMP-A","category":"nuclear","quantity":20}]'::jsonb, true),
('BA 125 Istres', 'France', 'French Air Force', 'air_base', 43.5237, 4.9238, 'Strategic air command and long-range operations', '[{"type":"Rafale","category":"fighter","quantity":20},{"type":"A330 MRTT","category":"tanker","quantity":12}]'::jsonb, true),
('Ile Longue SSBN Base', 'France', 'French Navy', 'naval_base', 48.2887, -4.5114, 'Continuous at-sea deterrence SSBN base', '[{"type":"Le Triomphant-class SSBN","category":"submarine","quantity":4}]'::jsonb, true),

-- =============================================
-- GERMANY
-- =============================================
('Büchel Air Base', 'Germany', 'German Air Force', 'air_base', 50.1738, 7.0633, 'NATO nuclear sharing base with B61 bombs', '[{"type":"Tornado IDS","category":"fighter","quantity":33},{"type":"B-61","category":"nuclear","quantity":20}]'::jsonb, true),
('Wilhelmshaven Naval Base', 'Germany', 'German Navy', 'naval_base', 53.5228, 8.1419, 'German Navy fleet headquarters', '[{"type":"F125 Frigate","category":"frigate","quantity":4},{"type":"Type 212 Submarine","category":"submarine","quantity":6}]'::jsonb, true),
('Neuburg Air Base', 'Germany', 'German Air Force', 'air_base', 48.7108, 11.2115, 'Eurofighter Typhoon QRA base', '[{"type":"Eurofighter Typhoon","category":"fighter","quantity":30}]'::jsonb, true),

-- =============================================
-- ITALY
-- =============================================
('Gioia del Colle Air Base', 'Italy', 'Italian Air Force', 'air_base', 40.7670, 16.9330, 'F-35A Lightning II deployment base', '[{"type":"F-35A","category":"fighter","quantity":15},{"type":"Eurofighter","category":"fighter","quantity":18}]'::jsonb, true),
('La Maddalena Naval Base', 'Italy', 'Italian Navy', 'naval_base', 41.2170, 9.4070, 'Mediterranean submarine and surface fleet base', '[{"type":"FREMM Frigate","category":"frigate","quantity":6}]'::jsonb, true),
('Naval Station Sigonella', 'Italy', 'US Navy', 'air_base', 37.4017, 14.9222, 'Major US Navy Mediterranean hub, drone operations', '[{"type":"MQ-4C Triton","category":"uav","quantity":4},{"type":"P-8A Poseidon","category":"patrol","quantity":6}]'::jsonb, true),
('Ghedi Air Base', 'Italy', 'Italian Air Force', 'air_base', 45.4322, 10.2776, 'NATO nuclear sharing with B-61 and Tornado', '[{"type":"Tornado IDS","category":"fighter","quantity":24},{"type":"B-61","category":"nuclear","quantity":20}]'::jsonb, true),

-- =============================================
-- TURKEY
-- =============================================
('Aksaz Naval Base', 'Turkey', 'Turkish Navy', 'naval_base', 36.9539, 28.3831, 'Southern Fleet Command on Aegean coast', '[{"type":"MILGEM Corvette","category":"corvette","quantity":4},{"type":"Type 209 Submarine","category":"submarine","quantity":6}]'::jsonb, true),
('Diyarbakir Air Base', 'Turkey', 'Turkish Air Force', 'air_base', 37.8939, 40.2010, 'Eastern Turkey F-16 operations base', '[{"type":"F-16","category":"fighter","quantity":48}]'::jsonb, true),
('Konya Air Base', 'Turkey', 'Turkish Air Force', 'air_base', 37.9797, 32.5617, 'AWACS and fighter training base', '[{"type":"E-7T AWACS","category":"awacs","quantity":4},{"type":"F-16","category":"fighter","quantity":24}]'::jsonb, true),

-- =============================================
-- EGYPT
-- =============================================
('Alexandria Naval Base', 'Egypt', 'Egyptian Navy', 'naval_base', 31.1813, 29.8538, 'Mediterranean Fleet headquarters', '[{"type":"FREMM Frigate","category":"frigate","quantity":1},{"type":"Type 209 Submarine","category":"submarine","quantity":4}]'::jsonb, true),
('Cairo West Air Base', 'Egypt', 'Egyptian Air Force', 'air_base', 30.1164, 30.9152, 'F-16 and Rafale operations', '[{"type":"F-16","category":"fighter","quantity":60},{"type":"Rafale","category":"fighter","quantity":24}]'::jsonb, true),
('Berenice Military Base', 'Egypt', 'Egyptian Military', 'mixed', 23.9300, 35.4700, 'Red Sea military base near Sudan border', '[{"type":"Mistral LHD","category":"amphibious","quantity":2}]'::jsonb, true),
('Mohamed Naguib Military City', 'Egypt', 'Egyptian Military', 'mixed', 31.0200, 28.0800, 'Largest military base in Middle East and Africa', '[]'::jsonb, true),

-- =============================================
-- SAUDI ARABIA
-- =============================================
('King Abdulaziz Air Base (Dhahran)', 'Saudi Arabia', 'Royal Saudi Air Force', 'air_base', 26.2651, 50.1526, 'Eastern Province main air defense base', '[{"type":"F-15SA","category":"fighter","quantity":36},{"type":"Patriot PAC-3","category":"missile_defense","quantity":4}]'::jsonb, true),
('King Faisal Air Base (Tabuk)', 'Saudi Arabia', 'Royal Saudi Air Force', 'air_base', 28.3654, 36.6218, 'Northwestern operations near Red Sea', '[{"type":"Typhoon","category":"fighter","quantity":48}]'::jsonb, true),
('King Khalid Military City', 'Saudi Arabia', 'Royal Saudi Military', 'mixed', 27.9000, 45.5333, 'Northern defense complex near Iraq/Kuwait border', '[{"type":"M1A2 Abrams","category":"tank","quantity":200}]'::jsonb, true),
('Jubail Naval Base', 'Saudi Arabia', 'Royal Saudi Navy', 'naval_base', 27.0046, 49.6221, 'Eastern Fleet on Persian Gulf', '[{"type":"Al Riyadh-class Frigate","category":"frigate","quantity":3}]'::jsonb, true),
('Jeddah Naval Base', 'Saudi Arabia', 'Royal Saudi Navy', 'naval_base', 21.4800, 39.1700, 'Western Fleet on Red Sea', '[{"type":"Al Madinah-class Frigate","category":"frigate","quantity":4}]'::jsonb, true),

-- =============================================
-- UAE
-- =============================================
('Al Dhafra Air Base (UAE)', 'UAE', 'UAE Air Force', 'air_base', 24.2481, 54.5482, 'UAE and French Mirage 2000 / Rafale operations', '[{"type":"Mirage 2000-9","category":"fighter","quantity":62},{"type":"F-16E/F","category":"fighter","quantity":80}]'::jsonb, true),
('Zayed Military City', 'UAE', 'UAE Armed Forces', 'mixed', 24.0950, 54.4750, 'UAE Armed Forces main garrison', '[{"type":"Leclerc","category":"tank","quantity":388}]'::jsonb, true),

-- =============================================
-- NATO (Others)
-- =============================================
('Redzikowo Aegis Ashore', 'Poland', 'US Navy', 'missile_defense', 54.4792, 17.0990, 'Aegis Ashore ballistic missile defense site', '[{"type":"SM-3","category":"missile_defense","quantity":24}]'::jsonb, true),
('Lask Air Base', 'Poland', 'Polish Air Force', 'air_base', 51.5519, 19.1792, 'F-16 and future F-35 base', '[{"type":"F-16C/D","category":"fighter","quantity":36}]'::jsonb, true),
('Deveselu Aegis Ashore', 'Romania', 'US Navy', 'missile_defense', 43.9977, 24.4338, 'Aegis Ashore BMD site in Romania', '[{"type":"SM-3","category":"missile_defense","quantity":24}]'::jsonb, true),
('Keflavik Air Base', 'Iceland', 'NATO', 'air_base', 63.9850, -22.6056, 'NATO air policing and GIUK gap surveillance', '[{"type":"P-8A Poseidon","category":"patrol","quantity":2}]'::jsonb, true),
('Bardufoss Air Station', 'Norway', 'Royal Norwegian Air Force', 'air_base', 69.0578, 18.5404, 'F-35 operations in Arctic Norway', '[{"type":"F-35A","category":"fighter","quantity":24}]'::jsonb, true),
('Orland Air Base', 'Norway', 'Royal Norwegian Air Force', 'air_base', 63.6989, 9.6040, 'Main F-35A deployment base', '[{"type":"F-35A","category":"fighter","quantity":28}]'::jsonb, true),
('Siauliai Air Base', 'Lithuania', 'NATO', 'air_base', 55.8938, 23.3946, 'NATO Baltic Air Policing rotational base', '[{"type":"NATO QRA fighters","category":"fighter","quantity":4}]'::jsonb, true),
('Amari Air Base', 'Estonia', 'NATO', 'air_base', 59.2603, 24.2086, 'NATO Baltic Air Policing support base', '[{"type":"NATO QRA fighters","category":"fighter","quantity":4}]'::jsonb, true),
('Tapa Military Base', 'Estonia', 'NATO', 'mixed', 59.2619, 25.9683, 'NATO Enhanced Forward Presence battalion', '[{"type":"Challenger 2","category":"tank","quantity":12}]'::jsonb, true),
('Adazi Military Base', 'Latvia', 'NATO', 'mixed', 57.0756, 24.3294, 'NATO Enhanced Forward Presence battlegroup', '[{"type":"Leopard 2","category":"tank","quantity":8}]'::jsonb, true),
('Souda Bay Naval Base', 'Greece', 'NATO / US Navy', 'naval_base', 35.4914, 24.1183, 'NATO and US naval support activity in Crete', '[{"type":"P-3 Orion","category":"patrol","quantity":4}]'::jsonb, true),
('Florennes Air Base', 'Belgium', 'Belgian Air Component', 'air_base', 50.2433, 4.6447, 'F-35 deployment base (transitioning)', '[{"type":"F-16","category":"fighter","quantity":24}]'::jsonb, true),
('Kleine Brogel Air Base', 'Belgium', 'Belgian Air Component', 'air_base', 51.1681, 5.4700, 'NATO nuclear sharing base', '[{"type":"F-16","category":"fighter","quantity":18},{"type":"B-61","category":"nuclear","quantity":10}]'::jsonb, true),
('Leeuwarden Air Base', 'Netherlands', 'Royal Netherlands Air Force', 'air_base', 53.2286, 5.7606, 'F-35A operations base', '[{"type":"F-35A","category":"fighter","quantity":24}]'::jsonb, true),
('Volkel Air Base', 'Netherlands', 'Royal Netherlands Air Force', 'air_base', 51.6561, 5.7072, 'NATO nuclear sharing base', '[{"type":"F-35A","category":"fighter","quantity":18},{"type":"B-61","category":"nuclear","quantity":10}]'::jsonb, true),

-- =============================================
-- CANADA
-- =============================================
('CFB Esquimalt', 'Canada', 'Royal Canadian Navy', 'naval_base', 48.4322, -123.4289, 'Pacific Fleet base', '[{"type":"Halifax-class Frigate","category":"frigate","quantity":6}]'::jsonb, true),
('CFB Halifax', 'Canada', 'Royal Canadian Navy', 'naval_base', 44.6473, -63.5822, 'Atlantic Fleet base', '[{"type":"Halifax-class Frigate","category":"frigate","quantity":6}]'::jsonb, true),
('CFB Cold Lake', 'Canada', 'Royal Canadian Air Force', 'air_base', 54.4050, -110.2794, 'CF-18 operations and weapons testing range', '[{"type":"CF-188 Hornet","category":"fighter","quantity":36}]'::jsonb, true),

-- =============================================
-- BRAZIL
-- =============================================
('Sao Pedro da Aldeia Naval Air Station', 'Brazil', 'Brazilian Navy', 'air_base', -22.8128, -42.0928, 'Naval aviation headquarters', '[{"type":"AF-1 Skyhawk","category":"fighter","quantity":12}]'::jsonb, true),
('Anapolis Air Base', 'Brazil', 'Brazilian Air Force', 'air_base', -16.2292, -48.9642, 'Gripen fighter deployment base', '[{"type":"Gripen E/F","category":"fighter","quantity":36}]'::jsonb, true),
('Base Naval de Val-de-Caes', 'Brazil', 'Brazilian Navy', 'naval_base', -1.4560, -48.4939, 'Northern naval command', '[]'::jsonb, true),

-- =============================================
-- TAIWAN
-- =============================================
('Zuoying Naval Base', 'Taiwan', 'ROC Navy', 'naval_base', 22.6905, 120.2851, 'Main fleet base in southern Taiwan', '[{"type":"Kidd-class Destroyer","category":"destroyer","quantity":4},{"type":"Lafayette-class Frigate","category":"frigate","quantity":6}]'::jsonb, true),
('Hualien Air Base', 'Taiwan', 'ROC Air Force', 'air_base', 24.0231, 121.6183, 'F-16V fighter base on east coast with mountain tunnels', '[{"type":"F-16V","category":"fighter","quantity":42}]'::jsonb, true),
('Chiayi Air Base', 'Taiwan', 'ROC Air Force', 'air_base', 23.4614, 120.3928, 'F-16V and AIDC F-CK-1 base', '[{"type":"F-16V","category":"fighter","quantity":36}]'::jsonb, true),
('Taichung Ching Chuan Kang', 'Taiwan', 'ROC Air Force', 'air_base', 24.2644, 120.6208, 'Major central Taiwan air base', '[{"type":"Mirage 2000-5","category":"fighter","quantity":48}]'::jsonb, true),

-- =============================================
-- ISRAEL (additional strategic sites)
-- =============================================
('Ofek Base (Unit 9900)', 'Israel', 'Israeli Intelligence', 'command_center', 31.8609, 34.6640, 'Satellite imagery and signals intelligence center', '[]'::jsonb, true),
('Tel Nof Air Base', 'Israel', 'Israeli Air Force', 'air_base', 31.8396, 34.8183, 'F-35I Adir and special operations base', '[{"type":"F-35I Adir","category":"fighter","quantity":36}]'::jsonb, true),

-- =============================================
-- SPAIN
-- =============================================
('Moron Air Base', 'Spain', 'US Air Force / Spanish Air Force', 'air_base', 37.1749, -5.6151, 'US AFRICOM rapid response and aerial refueling', '[{"type":"KC-135","category":"tanker","quantity":5}]'::jsonb, true),
('Zaragoza Air Base', 'Spain', 'Spanish Air Force', 'air_base', 41.6662, -1.0415, 'Eurofighter Typhoon base', '[{"type":"Eurofighter Typhoon","category":"fighter","quantity":36}]'::jsonb, true),

-- =============================================
-- SINGAPORE
-- =============================================
('Changi Naval Base', 'Singapore', 'Republic of Singapore Navy', 'naval_base', 1.3284, 103.9765, 'Main naval base and littoral operations hub', '[{"type":"Formidable-class Frigate","category":"frigate","quantity":6},{"type":"Invincible-class Submarine","category":"submarine","quantity":4}]'::jsonb, true),
('Tengah Air Base', 'Singapore', 'Republic of Singapore Air Force', 'air_base', 1.3873, 103.7092, 'F-15SG and F-35 operations', '[{"type":"F-15SG","category":"fighter","quantity":24},{"type":"F-35B","category":"fighter","quantity":8}]'::jsonb, true)

ON CONFLICT DO NOTHING;
