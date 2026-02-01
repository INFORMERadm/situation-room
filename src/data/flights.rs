// Flight tracking from OpenSky Network
// Anonymous access: 10-second resolution, current state vectors only

use anyhow::Result;
use serde::Deserialize;

use crate::app::Flight;

const OPENSKY_URL: &str = "https://opensky-network.org/api/states/all";

// Notable callsigns to watch for
const NOTABLE_CALLSIGNS: &[&str] = &[
    "AF1",      // Air Force One
    "AF2",      // Air Force Two
    "SAM",      // Special Air Mission
    "EXEC",     // Executive flights
    "NAVY",     // Navy aircraft
    "RCH",      // Air Mobility Command
    "EVAC",     // Medical evacuation
];

#[derive(Debug, Deserialize)]
struct OpenSkyResponse {
    time: i64,
    states: Option<Vec<OpenSkyState>>,
}

// OpenSky returns states as arrays, not objects
// [icao24, callsign, origin_country, time_position, last_contact, longitude, latitude, ...]
type OpenSkyState = Vec<serde_json::Value>;

/// Extract callsign from OpenSky state array (index 1)
fn get_callsign(state: &OpenSkyState) -> Option<String> {
    state.get(1)
        .and_then(|v| v.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

/// Extract origin country from OpenSky state array (index 2)
fn get_origin_country(state: &OpenSkyState) -> String {
    state.get(2)
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown")
        .to_string()
}

/// Check if flight is on ground (index 8)
fn is_on_ground(state: &OpenSkyState) -> bool {
    state.get(8)
        .and_then(|v| v.as_bool())
        .unwrap_or(false)
}

/// Get altitude in feet (index 7 is geo_altitude in meters)
fn get_altitude(state: &OpenSkyState) -> Option<f64> {
    state.get(7)
        .and_then(|v| v.as_f64())
        .map(|m| m * 3.28084) // Convert to feet
}

/// Get longitude (index 5)
fn get_longitude(state: &OpenSkyState) -> Option<f64> {
    state.get(5).and_then(|v| v.as_f64())
}

/// Get latitude (index 6)
fn get_latitude(state: &OpenSkyState) -> Option<f64> {
    state.get(6).and_then(|v| v.as_f64())
}

/// Check if callsign matches notable patterns
fn is_notable_callsign(callsign: &str) -> bool {
    let upper = callsign.to_uppercase();
    NOTABLE_CALLSIGNS.iter().any(|prefix| upper.starts_with(prefix))
}

/// Fetch flight data from OpenSky Network
pub async fn fetch_flights() -> Vec<Flight> {
    match fetch_flights_internal().await {
        Ok(flights) => flights,
        Err(e) => {
            eprintln!("Error fetching flight data: {}", e);
            vec![]
        }
    }
}

async fn fetch_flights_internal() -> Result<Vec<Flight>> {
    let client = reqwest::Client::new();
    let response = client
        .get(OPENSKY_URL)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await?;
    
    if !response.status().is_success() {
        return Ok(vec![]);
    }
    
    let data: OpenSkyResponse = response.json().await?;
    let states = data.states.unwrap_or_default();
    
    // First, try to find notable flights
    let mut flights: Vec<Flight> = states.iter()
        .filter_map(|state| {
            let callsign = get_callsign(state)?;
            
            // Only include notable flights
            if !is_notable_callsign(&callsign) {
                return None;
            }
            
            let origin = get_origin_country(state);
            let on_ground = is_on_ground(state);
            let altitude = get_altitude(state);
            
            let status = if on_ground {
                "On Ground".to_string()
            } else if let Some(alt) = altitude {
                format!("FL{:.0}", alt / 100.0)
            } else {
                "In Flight".to_string()
            };
            
            Some(Flight {
                callsign,
                route: format!("Origin: {}", origin),
                status,
                lat: get_latitude(state),
                lon: get_longitude(state),
            })
        })
        .collect();
    
    // If no notable flights found, return some sample high-altitude flights
    if flights.is_empty() {
        flights = states.iter()
            .filter_map(|state| {
                let callsign = get_callsign(state)?;
                let altitude = get_altitude(state)?;
                
                // Filter for high-altitude flights (likely long-haul)
                if altitude < 35000.0 {
                    return None;
                }
                
                let origin = get_origin_country(state);
                
                Some(Flight {
                    callsign,
                    route: format!("Origin: {}", origin),
                    status: format!("FL{:.0}", altitude / 100.0),
                    lat: get_latitude(state),
                    lon: get_longitude(state),
                })
            })
            .take(5)
            .collect();
    }
    
    flights.truncate(5);
    Ok(flights)
}
