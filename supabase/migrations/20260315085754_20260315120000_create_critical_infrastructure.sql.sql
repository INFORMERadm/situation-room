/*
  # Create Critical Infrastructure Table

  ## Purpose
  Tracks critical infrastructure worldwide (Middle East focus) including airports, ports,
  nuclear sites, power grids, pipelines, refineries, government/military installations,
  and undersea cable landing points. Each entry has a status indicating whether it is
  intact, damaged, or destroyed.

  ## New Tables

  ### critical_infrastructure
  - `id` (uuid, PK) - Unique identifier
  - `name` (text) - Facility/site name
  - `country` (text) - Country name
  - `region` (text) - Broader geographic region
  - `infra_type` (text) - Category of infrastructure (see CHECK constraint)
  - `status` (text) - Current status: intact | damaged | destroyed | unknown
  - `latitude` (double precision) - Geographic latitude
  - `longitude` (double precision) - Geographic longitude
  - `description` (text) - Details about the site
  - `last_incident_date` (text) - Date of most recent attack/incident if any
  - `incident_notes` (text) - Notes about attacks, perpetrators, damage extent
  - `source_url` (text) - Reference/source URL
  - `metadata` (jsonb) - Extra structured data (capacity, ownership, etc.)
  - `created_at` / `updated_at` (timestamptz)

  ## Security
  - RLS enabled: authenticated users can SELECT all records
  - Only service_role can INSERT/UPDATE/DELETE

  ## Notes
  1. infra_type values: airport | port | highway | electricity | nuclear | government |
     military_intel | pipeline | refinery | undersea_cable | water | telecom | other
  2. status values: intact | damaged | destroyed | unknown
  3. Indexes on lat/lng for spatial bounds queries
*/

CREATE TABLE IF NOT EXISTS critical_infrastructure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  infra_type text NOT NULL DEFAULT 'other',
  status text NOT NULL DEFAULT 'intact',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  description text NOT NULL DEFAULT '',
  last_incident_date text NOT NULL DEFAULT '',
  incident_notes text NOT NULL DEFAULT '',
  source_url text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE critical_infrastructure ADD CONSTRAINT critical_infrastructure_infra_type_check
  CHECK (infra_type IN ('airport','port','highway','electricity','nuclear','government','military_intel','pipeline','refinery','undersea_cable','water','telecom','other'));

ALTER TABLE critical_infrastructure ADD CONSTRAINT critical_infrastructure_status_check
  CHECK (status IN ('intact','damaged','destroyed','unknown'));

CREATE INDEX IF NOT EXISTS idx_critical_infra_coords ON critical_infrastructure (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_critical_infra_type ON critical_infrastructure (infra_type);
CREATE INDEX IF NOT EXISTS idx_critical_infra_status ON critical_infrastructure (status);
CREATE INDEX IF NOT EXISTS idx_critical_infra_country ON critical_infrastructure (country);

ALTER TABLE critical_infrastructure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view critical infrastructure"
  ON critical_infrastructure FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- SEED DATA: Critical Infrastructure
-- ============================================================

INSERT INTO critical_infrastructure (name, country, region, infra_type, status, latitude, longitude, description, last_incident_date, incident_notes, source_url) VALUES

-- ===================== AIRPORTS =====================
('Ben Gurion International Airport', 'Israel', 'Middle East', 'airport', 'intact', 32.0055, 34.8854, 'Israel''s main international airport serving Tel Aviv. Subject to rocket and drone alerts.', '2024-04-14', 'Temporarily closed during Iranian drone/missile attack April 2024. Resumed operations.', 'https://en.wikipedia.org/wiki/Ben_Gurion_Airport'),
('Haifa Airport', 'Israel', 'Middle East', 'airport', 'damaged', 32.8094, 35.0431, 'Domestic airport in northern Israel. Repeatedly targeted by Hezbollah rockets.', '2024-09-22', 'Multiple rocket impacts in vicinity during Hezbollah escalation 2024.', ''),
('Ramon Airport (Eilat)', 'Israel', 'Middle East', 'airport', 'damaged', 29.7236, 35.0114, 'Southern Israel international airport near Eilat. Targeted by Houthi drones and ballistic missiles.', '2024-09-10', 'Struck by Houthi hypersonic ballistic missile Sept 2024; partial damage to terminal.', 'https://en.wikipedia.org/wiki/Ramon_Airport'),
('Beirut Rafic Hariri International Airport', 'Lebanon', 'Middle East', 'airport', 'damaged', 33.8209, 35.4884, 'Lebanon''s only international airport. Severely impacted by Israeli strikes during 2024 war.', '2024-10-04', 'Runways and fuel depot damaged in Israeli strikes Oct 2024; partially closed.', 'https://en.wikipedia.org/wiki/Beirut_Rafic_Hariri_International_Airport'),
('Damascus International Airport', 'Syria', 'Middle East', 'airport', 'damaged', 33.4114, 36.5156, 'Main Syrian international airport. Repeatedly struck by Israeli Air Force targeting weapons transfers.', '2024-04-01', 'Multiple Israeli strikes on runways and cargo facilities; temporarily closed multiple times.', 'https://en.wikipedia.org/wiki/Damascus_International_Airport'),
('Aleppo International Airport', 'Syria', 'Middle East', 'airport', 'destroyed', 36.1807, 37.2244, 'Syria''s second largest airport. Destroyed by Israeli airstrikes in December 2024.', '2024-12-08', 'Completely destroyed following fall of Assad regime; runways cratered, terminal demolished.', ''),
('Sana''a International Airport', 'Yemen', 'Middle East', 'airport', 'damaged', 15.4763, 44.2197, 'Yemen''s main airport in Houthi-controlled capital. Struck multiple times by Saudi coalition.', '2022-01-18', 'Repeatedly bombed by Saudi-led coalition; partially operational under Houthi control.', 'https://en.wikipedia.org/wiki/Sana%27a_International_Airport'),
('Hudaydah Airport', 'Yemen', 'Middle East', 'airport', 'destroyed', 14.7530, 42.9763, 'Airport near the key Red Sea port city. Destroyed in coalition airstrikes.', '2018-12-15', 'Runway cratered, terminal destroyed. No longer operational.', ''),
('Baghdad International Airport', 'Iraq', 'Middle East', 'airport', 'intact', 33.2625, 44.2346, 'Iraq''s main international hub. Site of US drone strike killing Qasem Soleimani in Jan 2020.', '2020-01-03', 'US strike on airport road; airport itself undamaged but politically significant.', 'https://en.wikipedia.org/wiki/Baghdad_International_Airport'),
('Tehran Imam Khomeini International Airport', 'Iran', 'Middle East', 'airport', 'intact', 35.4161, 51.1522, 'Iran''s main international gateway south of Tehran.', '', '', 'https://en.wikipedia.org/wiki/Tehran_Imam_Khomeini_International_Airport'),
('Mehrabad International Airport', 'Iran', 'Middle East', 'airport', 'damaged', 35.6892, 51.3134, 'Tehran''s domestic and older international airport. Targeted by Israeli strike April 2024 nearby.', '2024-04-19', 'Israeli Air Force struck Isfahan radar site; Mehrabad remained intact but on alert.', ''),
('Isfahan Airport', 'Iran', 'Middle East', 'airport', 'damaged', 32.7509, 51.8613, 'Major Iranian airport and air base near Isfahan. Israeli strike hit adjacent military radar April 2024.', '2024-04-19', 'Israeli precision strike on S-300 radar system immediately adjacent to airport.', ''),

-- ===================== PORTS =====================
('Port of Haifa', 'Israel', 'Middle East', 'port', 'intact', 32.8184, 35.0005, 'Israel''s largest port and main naval base. Strategic Hezbollah target.', '2024-10-03', 'Hezbollah fired Burkan rockets toward Haifa port area; diverted by Iron Dome.', 'https://en.wikipedia.org/wiki/Haifa_Port'),
('Port of Ashdod', 'Israel', 'Middle East', 'port', 'intact', 31.8143, 34.6425, 'Israel''s southern container port. Targeted by Hamas rockets from Gaza.', '2023-10-12', 'Multiple rocket salvos intercepted over port area during Gaza war 2023-24.', ''),
('Port of Eilat', 'Israel', 'Middle East', 'port', 'damaged', 29.5569, 34.9500, 'Red Sea port severely impacted by Houthi shipping campaign.', '2024-07-19', 'Houthi drone struck vessel in port area; commercial shipping down 80%; port facing economic crisis.', ''),
('Port of Beirut', 'Lebanon', 'Middle East', 'port', 'destroyed', 33.9006, 35.5197, 'Lebanon''s main commercial port. Catastrophically destroyed in massive explosion August 2020.', '2020-08-04', '2,750 tonnes of ammonium nitrate exploded killing 218, injuring 6,000+. Port infrastructure largely destroyed. Slow reconstruction ongoing.', 'https://en.wikipedia.org/wiki/2020_Beirut_explosion'),
('Port of Latakia', 'Syria', 'Middle East', 'port', 'damaged', 35.5317, 35.7860, 'Syria''s main Mediterranean port. Struck multiple times by Israeli forces targeting weapons.', '2023-12-28', 'Israeli Navy and Air Force struck the port multiple times targeting Iranian weapons shipments.', ''),
('Port of Tartus', 'Syria', 'Middle East', 'port', 'intact', 34.8892, 35.8867, 'Syria''s second port. Russia''s only Mediterranean naval base. Target of Israeli strikes nearby.', '2023-07-25', 'Israeli strikes near Tartus area; Russian naval facility itself not directly struck.', ''),
('Port of Hodeidah', 'Yemen', 'Middle East', 'port', 'destroyed', 14.7994, 42.9557, 'Yemen''s main Red Sea port handling 70% of food imports. Repeatedly bombed.', '2024-07-20', 'Israeli airstrike destroyed fuel storage tanks July 2024 following Houthi drone attack on Tel Aviv. Major humanitarian crisis.', 'https://en.wikipedia.org/wiki/Hudaydah_port'),
('Port of Aden', 'Yemen', 'Middle East', 'port', 'damaged', 12.7855, 44.9784, 'Yemen''s southern port, contested during civil war.', '2021-11-05', 'Multiple bombings and clashes; partial damage to facilities.', ''),
('Bandar Abbas Port', 'Iran', 'Middle East', 'port', 'intact', 27.1865, 56.2808, 'Iran''s main naval base and commercial port on Strait of Hormuz. Critical chokepoint.', '', '', 'https://en.wikipedia.org/wiki/Bandar_Abbas'),
('Umm Qasr Port', 'Iraq', 'Middle East', 'port', 'intact', 30.0333, 47.9167, 'Iraq''s main deep-water commercial port and oil export terminal.', '', '', ''),

-- ===================== NUCLEAR INFRASTRUCTURE =====================
('Natanz Nuclear Enrichment Facility', 'Iran', 'Middle East', 'nuclear', 'damaged', 33.7224, 51.7270, 'Iran''s primary uranium enrichment complex. Underground cascades with IR-1 and advanced centrifuges. IAEA-monitored.', '2024-04-19', 'Believed to be primary target of Israeli airstrike April 2024. Exact damage unknown; Iran denied significant damage. Previously struck by Stuxnet cyberattack 2010 and Mossad sabotage 2021.', 'https://en.wikipedia.org/wiki/Natanz_nuclear_facility'),
('Fordow Fuel Enrichment Plant', 'Iran', 'Middle East', 'nuclear', 'intact', 34.8843, 50.9934, 'Deeply buried underground enrichment facility near Qom. Enriching uranium to 60% purity. Most hardened Iranian nuclear site.', '2024-04-19', 'Israeli strike did not reach Fordow due to its depth (80m+ underground). US bunker-buster GBU-57 required.', 'https://en.wikipedia.org/wiki/Fordow_Fuel_Enrichment_Plant'),
('Arak Heavy Water Reactor', 'Iran', 'Middle East', 'nuclear', 'intact', 34.1417, 49.2111, 'Heavy water research reactor. Core removed and filled with concrete under JCPOA 2015.', '', 'Reactor core disabled under 2015 nuclear deal. Redesign ongoing under modified JCPOA terms.', 'https://en.wikipedia.org/wiki/IR-40_reactor'),
('Bushehr Nuclear Power Plant', 'Iran', 'Middle East', 'nuclear', 'intact', 28.8311, 50.8896, 'Iran''s only nuclear power plant. Russian-built VVER-1000 reactor, 1,000 MW. Operational since 2011.', '', 'Located near Persian Gulf; seismic and military strike vulnerability discussed by analysts.', 'https://en.wikipedia.org/wiki/Bushehr_Nuclear_Power_Plant'),
('Isfahan Uranium Conversion Facility', 'Iran', 'Middle East', 'nuclear', 'intact', 32.6278, 51.6592, 'Converts uranium ore into UF6 gas for enrichment. Critical node in nuclear fuel cycle.', '2024-04-19', 'Israeli strike on Isfahan targeted adjacent military radar. Conversion facility not directly hit.', ''),
('Saghand Uranium Mine', 'Iran', 'Middle East', 'nuclear', 'intact', 32.5683, 55.8983, 'Iran''s main domestic uranium ore mine in Yazd Province.', '', '', ''),
('Parchin Military Complex', 'Iran', 'Middle East', 'nuclear', 'intact', 35.5244, 51.7761, 'Classified military-industrial complex suspected of nuclear weapons research. IAEA access denied.', '', 'Suspected high-explosive testing for nuclear warhead development. Satellite imagery shows repeated construction and demolition.', 'https://en.wikipedia.org/wiki/Parchin_military_complex'),
('Dimona Nuclear Research Center (Negev Nuclear Research Center)', 'Israel', 'Middle East', 'nuclear', 'intact', 30.8541, 35.1440, 'Israel''s main nuclear facility believed to produce plutonium for weapons. Officially undeclared program.', '2024-04-14', 'Iranian ballistic missile passed near Dimona in April 2024 strike. Intercepted by Arrow-3. Facility undamaged.', 'https://en.wikipedia.org/wiki/Negev_Nuclear_Research_Center'),

-- ===================== ELECTRICITY INFRASTRUCTURE =====================
('Mosul Dam Power Station', 'Iraq', 'Middle East', 'electricity', 'damaged', 36.6328, 42.8281, 'Iraq''s largest dam and hydroelectric station. Structural integrity concerns since 2006.', '2014-08-07', 'Briefly seized by ISIS 2014; retaken by US-Kurdish forces. Structural grouting program ongoing; collapse risk cited.', 'https://en.wikipedia.org/wiki/Mosul_Dam'),
('Haditha Dam Power Station', 'Iraq', 'Middle East', 'electricity', 'intact', 34.2083, 42.3667, 'Iraq''s second largest hydroelectric dam on Euphrates. Seized briefly by ISIS 2014.', '2014-06-24', 'ISIS briefly seized dam; retaken by Iraqi and US forces before gates were damaged.', ''),
('Risha Gas Power Station', 'Jordan', 'Middle East', 'electricity', 'intact', 32.1580, 38.3190, 'Jordan''s largest power station, gas-fired, near Iraqi border.', '', '', ''),
('Zarqa Power Station', 'Jordan', 'Middle East', 'electricity', 'intact', 32.0833, 36.1000, 'Major Jordanian thermal power facility supplying Amman area.', '', '', ''),
('Hadera Power Station', 'Israel', 'Middle East', 'electricity', 'intact', 32.4800, 34.9100, 'Israel''s second largest power station, coal-fired, on Mediterranean coast.', '2024-09-22', 'Hezbollah rockets fired toward power station area; intercepted.', ''),
('Orot Rabin Power Station', 'Israel', 'Middle East', 'electricity', 'intact', 32.4950, 34.8900, 'Israel''s largest coal power plant. Supplies ~20% of national electricity.', '', '', ''),
('Jieh Power Plant', 'Lebanon', 'Middle East', 'electricity', 'destroyed', 33.5856, 35.5939, 'Lebanon''s main coastal power plant. Destroyed by Israeli airstrike in 2006 war causing major oil spill.', '2006-07-15', 'Israeli airstrike caused fuel tank fire and massive Mediterranean oil spill during 2006 Lebanon War. Partially rebuilt.', ''),
('Zahrani Oil Facilities / Power Plant', 'Lebanon', 'Middle East', 'electricity', 'damaged', 33.5333, 35.3667, 'Combined oil refinery and power generation facility. Struck 2006, damaged again 2024.', '2024-09-28', 'Israeli strikes in vicinity during 2024 Lebanon war operations.', ''),
('Aleppo Power Station', 'Syria', 'Middle East', 'electricity', 'destroyed', 36.0500, 37.2000, 'Main electricity supply for Aleppo city. Destroyed during Syrian civil war.', '2015-11-01', 'Destroyed during fighting for Aleppo. City suffered years of power outages.', ''),
('Tishrin Dam Hydroelectric', 'Syria', 'Middle East', 'electricity', 'damaged', 36.5500, 38.1167, 'Major Syrian hydroelectric facility on Euphrates. Fought over by ISIS, SDF, and other factions.', '2022-09-15', 'Repeated targeting; structural damage. Controlled by SDF/SDC forces.', ''),
('Bandar Abbas Power Plant', 'Iran', 'Middle East', 'electricity', 'intact', 27.2000, 56.3000, 'Major thermal power station serving southern Iran and Hormozgan Province.', '', '', ''),
('Sana''a Power Grid Substations', 'Yemen', 'Middle East', 'electricity', 'destroyed', 15.3500, 44.2000, 'Main electrical grid substations for Sana''a. Repeatedly struck by Saudi coalition.', '2022-01-20', 'Saudi airstrike destroyed primary substations. Sana''a has experienced near-total power outages for years.', ''),
('Marib Gas Power Plant', 'Yemen', 'Middle East', 'electricity', 'damaged', 15.4500, 45.3500, 'Yemen''s largest gas power station. Fought over between government and Houthi forces.', '2021-02-10', 'Houthi ballistic missile and drone attacks on Marib repeatedly; power plant caught in fighting.', ''),

-- ===================== OIL & GAS PIPELINES =====================
('Trans-Arabian Pipeline (Tapline) - Defunct', 'Saudi Arabia', 'Middle East', 'pipeline', 'intact', 28.3000, 36.5000, 'Historic 1,700km pipeline from Saudi oil fields to Lebanon/Syria. Decommissioned 1990. Route still strategically significant.', '', 'Ceased operations 1990. Saudi Arabian section occasionally used for domestic purposes.', 'https://en.wikipedia.org/wiki/Trans-Arabian_Pipeline'),
('Iraq-Turkey Kirkuk-Ceyhan Pipeline', 'Iraq', 'Middle East', 'pipeline', 'damaged', 36.2000, 43.1000, 'Major export pipeline from Kirkuk oilfields to Turkish Mediterranean port of Ceyhan. 970km.', '2022-04-14', 'Repeated PKK/sabotage attacks; flows halted after Turkey-Iraq legal dispute 2023. Pumping suspended for months.', 'https://en.wikipedia.org/wiki/Kirkuk%E2%80%93Ceyhan_oil_pipeline'),
('IGAT-1 Iranian Gas Trunkline', 'Iran', 'Middle East', 'pipeline', 'intact', 32.0000, 52.0000, 'Iran''s main natural gas transmission pipeline system connecting fields to cities.', '', '', ''),
('Arab Gas Pipeline', 'Egypt', 'Middle East', 'pipeline', 'damaged', 31.0000, 32.5000, 'Pipeline from Egypt through Jordan to Syria and Lebanon. Egyptian section attacked by Sinai militants.', '2014-07-04', 'Multiple bombings in Sinai section by jihadist militants; pipeline flow disrupted repeatedly 2011-2014.', 'https://en.wikipedia.org/wiki/Arab_Gas_Pipeline'),
('Saudi Aramco East-West Pipeline (Petroline)', 'Saudi Arabia', 'Middle East', 'pipeline', 'damaged', 25.0000, 44.0000, 'World''s longest oil pipeline, 1,200km, crossing Saudi Arabia east to west. 5 million bpd capacity.', '2019-05-14', 'Houthi drone/cruise missile attack struck two pump stations, causing fires and brief shutdown May 2019.', 'https://en.wikipedia.org/wiki/East%E2%80%93West_Pipeline_(Saudi_Arabia)'),
('Abqaiq-Khurais Pipeline (Saudi Aramco)', 'Saudi Arabia', 'Middle East', 'pipeline', 'damaged', 25.9333, 49.6833, 'Pipeline connecting Abqaiq processing plant to Khurais oilfield.', '2019-09-14', 'Massive Houthi/Iranian drone and cruise missile attack on Abqaiq processing facility and Khurais field. Temporarily knocked out 5.7 million bpd = 5% of global supply.', 'https://en.wikipedia.org/wiki/2019_Abqaiq%E2%80%93Khurais_attack'),
('BTC Pipeline (Baku-Tbilisi-Ceyhan)', 'Azerbaijan', 'Caucasus', 'pipeline', 'intact', 40.8000, 48.5000, 'Major oil export pipeline from Caspian to Mediterranean. 1,768km. 1.2 million bpd.', '2008-08-05', 'PKK bomb attack on Turkish section during Russia-Georgia war 2008; brief shutdown.', 'https://en.wikipedia.org/wiki/Baku%E2%80%93Tbilisi%E2%80%93Ceyhan_pipeline'),

-- ===================== REFINERIES =====================
('Abadan Oil Refinery', 'Iran', 'Middle East', 'refinery', 'intact', 30.3394, 48.2653, 'One of world''s largest refineries historically. 400,000 bpd capacity. Heavily damaged Iran-Iraq War, rebuilt.', '1980-09-22', 'Extensively bombed during Iran-Iraq War 1980-88. Fully rebuilt. Now Iran''s largest refinery.', 'https://en.wikipedia.org/wiki/Abadan_refinery'),
('Bandar Abbas Refinery (Persian Gulf Star)', 'Iran', 'Middle East', 'refinery', 'intact', 27.1000, 56.1000, 'Massive new refinery complex producing condensate products. Strategic Iranian export facility.', '', '', ''),
('Baiji Oil Refinery', 'Iraq', 'Middle East', 'refinery', 'destroyed', 34.9333, 43.4833, 'Iraq''s largest refinery, 310,000 bpd. Captured and largely destroyed by ISIS during 2014-2015 battle.', '2015-10-17', 'Extended battle between ISIS and Iraqi forces. Facility extensively looted and destroyed. Partially rebuilt but never fully restored.', 'https://en.wikipedia.org/wiki/Baiji_oil_refinery'),
('Beji/Daura Refinery Baghdad', 'Iraq', 'Middle East', 'refinery', 'intact', 33.2800, 44.3800, 'Baghdad''s main refinery complex. Targeted during Gulf War 1991 and 2003 invasion.', '2003-04-09', 'US precision strikes during 2003 invasion; minor damage. Operational.', ''),
('Haifa Refinery (BAZAN Group)', 'Israel', 'Middle East', 'refinery', 'intact', 32.8000, 35.0500, 'Israel''s main oil refinery complex in Haifa Bay. Major Hezbollah target.', '2024-09-22', 'Hezbollah fired Burkan rockets and anti-tank missiles at Haifa Bay area including refinery zone; some fires but facility intact.', ''),
('Aden Refinery', 'Yemen', 'Middle East', 'refinery', 'destroyed', 12.7922, 45.0386, 'Yemen''s main refinery, 150,000 bpd. Destroyed during civil war fighting and airstrikes.', '2015-04-20', 'Fighting around Aden and Saudi coalition airstrikes destroyed refinery. No longer operational.', ''),
('Homs Oil Refinery', 'Syria', 'Middle East', 'refinery', 'destroyed', 34.7167, 36.7167, 'Syria''s largest refinery, 107,000 bpd. Heavily damaged in civil war; Israeli strikes.', '2018-09-09', 'Severely damaged by civil war fighting and repeated Israeli airstrikes targeting fuel for Hezbollah. Largely non-functional.', ''),
('Banias Refinery', 'Syria', 'Middle East', 'refinery', 'damaged', 35.1833, 35.9167, 'Syrian Mediterranean coast refinery. Repeatedly struck by Israeli forces.', '2020-11-18', 'Israeli airstrikes targeting Iranian oil deliveries and fuel storage at Banias port/refinery.', ''),

-- ===================== GOVERNMENT / MILITARY / INTELLIGENCE =====================
('IRGC Headquarters, Tehran', 'Iran', 'Middle East', 'military_intel', 'intact', 35.7448, 51.5015, 'Islamic Revolutionary Guard Corps main headquarters complex in Tehran.', '', 'Threatened by Israeli and US strike planners. Israel struck IRGC commanders in Syria and Lebanon.', ''),
('Iranian Ministry of Intelligence (VAJA), Tehran', 'Iran', 'Middle East', 'military_intel', 'intact', 35.7100, 51.4200, 'Iran''s civilian intelligence ministry headquarters. Runs foreign assets and domestic counterintelligence.', '', '', ''),
('Mossad Headquarters, Tel Aviv (HaKirya)', 'Israel', 'Middle East', 'military_intel', 'intact', 32.0787, 34.7984, 'Israel''s foreign intelligence service headquarters in the Tel Aviv HaKirya military campus.', '', '', ''),
('IDF Northern Command, Safed', 'Israel', 'Middle East', 'military_intel', 'damaged', 32.9806, 35.4794, 'Israel Defense Forces Northern Command headquarters. Primary command for Lebanon operations.', '2024-09-19', 'Hezbollah rocket and drone strikes on Safed area targeted IDF Northern Command installations.', ''),
('Shin Bet (ISA) Headquarters, Tel Aviv', 'Israel', 'Middle East', 'military_intel', 'intact', 32.0600, 34.7800, 'Israel''s internal security service headquarters in Tel Aviv.', '', '', ''),
('Syrian Presidential Palace, Damascus', 'Syria', 'Middle East', 'government', 'intact', 33.5131, 36.2903, 'Assad regime presidential complex on Mount Qassioun. Israeli strikes targeted nearby.', '2024-12-08', 'Abandoned by Assad during rebel offensive December 2024; regime fell.', ''),
('Hezbollah Command Bunker, Beirut Southern Suburbs (Dahiyeh)', 'Lebanon', 'Middle East', 'military_intel', 'destroyed', 33.8600, 35.5200, 'Hezbollah''s main command and control infrastructure in Beirut''s southern suburbs.', '2024-09-28', 'Israel struck Hezbollah''s main HQ in Dahiyeh killing Secretary General Hassan Nasrallah and multiple senior commanders. Extensive residential destruction.', 'https://en.wikipedia.org/wiki/Assassination_of_Hassan_Nasrallah'),
('Hezbollah Weapons Storage, Bekaa Valley', 'Lebanon', 'Middle East', 'military_intel', 'destroyed', 33.8500, 35.9000, 'Hezbollah''s main weapons storage and manufacturing area in eastern Lebanon.', '2024-09-30', 'Massive Israeli bombing campaign destroyed extensive tunnel networks, weapons depots, and manufacturing sites across Bekaa.', ''),
('Houthi Supreme Political Council, Sana''a', 'Yemen', 'Middle East', 'government', 'damaged', 15.3700, 44.1900, 'Houthi political and military command infrastructure in Sana''a.', '2024-07-20', 'Israeli airstrike hit Houthi military infrastructure in Sana''a following Houthi drone attack on Tel Aviv. Limited damage.', ''),
('Hamas Political Bureau, Gaza City', 'Gaza', 'Middle East', 'government', 'destroyed', 31.5017, 34.4668, 'Hamas political and military command infrastructure in Gaza. Multiple senior leaders eliminated.', '2024-07-31', 'Yahya Sinwar killed October 2024. Multiple Hamas commanders eliminated in targeted strikes. Command infrastructure largely destroyed.', ''),
('Iraqi PMF (Hashd al-Shaabi) Headquarters', 'Iraq', 'Middle East', 'military_intel', 'damaged', 33.3000, 44.4000, 'Pro-Iranian Popular Mobilization Forces command in Baghdad.', '2024-01-20', 'US drone strikes on PMF leadership following Jordan base attack. Multiple commanders killed.', ''),
('Khamenei Office/Residence Complex, Tehran', 'Iran', 'Middle East', 'government', 'intact', 35.7400, 51.4600, 'Supreme Leader Khamenei''s official complex in Tehran. Highest-value Iranian political target.', '', '', ''),

-- ===================== UNDERSEA CABLES =====================
('Red Sea Undersea Cables (Multiple) - Yemen Cut Zone', 'Yemen', 'Middle East', 'undersea_cable', 'damaged', 13.5000, 43.0000, 'Multiple critical undersea cables running through Red Sea. Houthi attacks in Feb 2024 cut AAE-1, EIG, and Seacom cables near Yemen.', '2024-02-24', 'Houthi forces severed 4 major undersea cables handling 25% of Europe-Asia internet traffic: AAE-1, EIG, Seacom, TGN-EA. Repairs hampered by ongoing conflict.', 'https://en.wikipedia.org/wiki/2024_Red_Sea_cable_cuts'),
('AAE-1 Cable System - Persian Gulf Segment', 'UAE', 'Middle East', 'undersea_cable', 'intact', 25.0000, 55.5000, 'Asia-Africa-Europe 1 cable system. 25,000km connecting Asia to Europe through Middle East. Landing points in UAE, Oman, Djibouti.', '', '', ''),
('SMW5 (SeaMeWe-5) Cable - Jeddah Landing', 'Saudi Arabia', 'Middle East', 'undersea_cable', 'intact', 21.4858, 39.1925, 'Southeast Asia-Middle East-Western Europe 5 cable. Major trunk cable landing at Jeddah.', '', '', ''),
('EIG Cable - Suez/Alexandria Landing', 'Egypt', 'Middle East', 'undersea_cable', 'damaged', 30.8500, 32.2500, 'Europe India Gateway cable. Landing near Suez. Cut during Red Sea crisis 2024.', '2024-02-24', 'Cable cut during Houthi underwater operations targeting Red Sea cables.', ''),
('PEACE Cable - Pakistan-Kenya-France', 'Pakistan', 'South Asia', 'undersea_cable', 'intact', 24.8607, 67.0104, 'Pakistan East Africa Connecting Europe cable. New route avoiding Red Sea choke point.', '', '', ''),
('FLAG/FALCON Cable - Persian Gulf', 'UAE', 'Middle East', 'undersea_cable', 'intact', 24.4539, 54.3773, 'Fiber-optic Link Around the Globe cable system with Persian Gulf segment.', '', '', ''),
('Mediterranean Cables (Multiple) - Alexandria Hub', 'Egypt', 'Middle East', 'undersea_cable', 'intact', 31.2001, 29.9187, 'Alexandria serves as major landing hub for dozens of submarine cables connecting Europe to Middle East and Asia.', '', '', ''),
('Tanap / Trans-Anatolian Pipeline - Undersea Section', 'Turkey', 'Europe', 'undersea_cable', 'intact', 38.5000, 26.5000, 'Note: This is a gas pipeline crossing the Aegean Sea floor, not a cable but similar undersea infrastructure significance.', '', '', ''),
('TAT-14 Transatlantic Cable - UK Landing', 'United Kingdom', 'Europe', 'undersea_cable', 'intact', 50.6000, -4.8000, 'Major transatlantic cable system landing in UK and France. Critical Europe-US internet link.', '', '', ''),
('MAREA Transatlantic Cable - Virginia Beach', 'United States', 'North America', 'undersea_cable', 'intact', 36.8529, -75.9780, 'Microsoft/Facebook owned transatlantic cable. 160Tbps capacity. Landing in Virginia Beach.', '', '', ''),
('APG Cable - East China Sea / Taiwan Strait', 'Taiwan', 'East Asia', 'undersea_cable', 'damaged', 25.0375, 121.5637, 'Asia Pacific Gateway cable. Chinese fishing vessel suspected of anchoring damage in Taiwan Strait.', '2023-02-08', 'Cable serving Matsu Islands cut, isolated Taiwan''s offshore islands from internet for months.', ''),

-- ===================== WATER INFRASTRUCTURE =====================
('Gaza Water/Sewage Infrastructure', 'Gaza', 'Middle East', 'water', 'destroyed', 31.4000, 34.3667, 'Gaza Strip''s water desalination plants, pumping stations and sewage treatment. Virtually entirely destroyed.', '2024-10-15', 'Over 70% of water infrastructure destroyed or damaged in 2023-24 war. Severe humanitarian crisis.', ''),
('Tigris River Dams System, Iraq', 'Iraq', 'Middle East', 'water', 'damaged', 35.5000, 43.3000, 'Iraq''s Tigris river dam system including Mosul, Dukan, Darbandikhan dams. Climate and conflict stressed.', '2014-08-07', 'ISIS temporarily seized Mosul Dam. Ongoing drought and reduced flows from Turkish dams upstream causing water crisis.', ''),
('National Water Carrier, Israel', 'Israel', 'Middle East', 'water', 'intact', 32.7200, 35.3600, 'Israel''s main water pipeline from Sea of Galilee to Negev. 130km main conduit.', '', '', ''),

-- ===================== TELECOMMUNICATIONS =====================
('Beirut Telecommunications Tower', 'Lebanon', 'Middle East', 'telecom', 'damaged', 33.8886, 35.5179, 'Lebanon''s main telecom relay tower and Ogero internet exchange infrastructure in Beirut.', '2020-08-04', 'Severely damaged in 2020 Beirut port explosion. Partial recovery.', ''),
('Gaza Internet Exchange / Telecom Infrastructure', 'Gaza', 'Middle East', 'telecom', 'destroyed', 31.5100, 34.4500, 'Gaza''s terrestrial telecom infrastructure including fiber, cell towers, and ISP facilities.', '2024-10-27', 'Israel severed Gaza''s last remaining fiber connection in October 2024. Complete telecom blackout periods. Most infrastructure destroyed.', ''),
('Iranian Internet Chokepoint - Tehran IXP', 'Iran', 'Middle East', 'telecom', 'intact', 35.7000, 51.4100, 'Iran''s national internet exchange point. Government controls all international traffic through single monitored gateway.', '2019-11-16', 'Government shut down all internet access during November 2019 protests. Architecture enables complete blackouts.', ''),

-- ===================== ADDITIONAL MIDDLE EAST =====================
('Abqaiq Oil Processing Facility', 'Saudi Arabia', 'Middle East', 'refinery', 'damaged', 25.9333, 49.6833, 'World''s largest crude oil processing facility. Handles up to 7% of global oil supply. Attacked by Houthi/Iranian drones 2019.', '2019-09-14', 'Drone and cruise missile strike caused massive fires. 5.7 million bpd knocked offline for weeks. US blamed Iran directly.', 'https://en.wikipedia.org/wiki/2019_Abqaiq%E2%80%93Khurais_attack'),
('Kharg Island Oil Export Terminal', 'Iran', 'Middle East', 'pipeline', 'intact', 29.2361, 50.3244, 'Iran''s main oil export terminal. Handles over 90% of Iranian oil exports. Major US/Israeli strike target in any war.', '', 'Highest-value Iranian economic target. Destruction would cripple Iranian economy.', 'https://en.wikipedia.org/wiki/Kharg_Island'),
('Ras Tanura Oil Terminal', 'Saudi Arabia', 'Middle East', 'pipeline', 'intact', 26.6464, 50.1631, 'World''s largest offshore oil loading facility. Handles ~6.5% of global oil supply. Critical Saudi Aramco terminal.', '2021-03-07', 'Houthi drone attack on Ras Tanura terminal and Abqaiq facility March 2021. Saudi Aramco confirmed attack; minor damage.', 'https://en.wikipedia.org/wiki/Ras_Tanura'),
('Strait of Hormuz Oil Infrastructure', 'Iran', 'Middle East', 'pipeline', 'intact', 26.5667, 56.2500, 'Critical global oil chokepoint. 20% of global oil passes through daily. Iranian coastal missile batteries threaten closure.', '', 'Iran has repeatedly threatened to close Strait. IRGC Navy maintains control of northern shore. Multiple tanker seizures 2019-2024.', 'https://en.wikipedia.org/wiki/Strait_of_Hormuz'),
('Mosul (Nineveh) Water Dam', 'Iraq', 'Middle East', 'water', 'damaged', 36.6328, 42.8281, 'Mosul Dam on the Tigris. Iraq''s largest dam. Structural integrity has been severely compromised.', '2014-08-07', 'ISIS briefly controlled dam Aug 2014. Grouting program ongoing to prevent catastrophic failure which would flood Mosul and Baghdad.', 'https://en.wikipedia.org/wiki/Mosul_Dam'),
('Suez Canal - Key Lock/Infrastructure', 'Egypt', 'North Africa', 'highway', 'intact', 30.5852, 32.2654, 'Suez Canal main navigation infrastructure connecting Red Sea to Mediterranean. Handles 12% of global trade.', '2021-03-23', 'MV Ever Given blockage March 2021 for 6 days; $9.6B daily trade loss. Houthi campaign 2023-24 caused major diversion away from Red Sea approach.', 'https://en.wikipedia.org/wiki/Suez_Canal'),
('Bab al-Mandab Strait Control Point', 'Djibouti', 'East Africa', 'highway', 'intact', 12.5878, 43.4452, 'Critical maritime chokepoint between Red Sea and Gulf of Aden. Houthi anti-ship campaign launched from Yemen targets vessels here.', '2024-01-15', 'Houthi maritime drone and missile attacks on commercial shipping since Oct 2023. 90% of pre-crisis traffic rerouted around Cape of Good Hope.', 'https://en.wikipedia.org/wiki/Bab-el-Mandeb');
