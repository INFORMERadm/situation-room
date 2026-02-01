// Pentagon Pizza Index from pizzint.watch
// Scrapes real-time pizza delivery patterns near the Pentagon

use anyhow::Result;
use serde::Deserialize;

const PIZZINT_URL: &str = "https://www.pizzint.watch/api/dashboard-data";

#[derive(Debug, Deserialize)]
struct PizzintResponse {
    success: bool,
    overall_index: Option<u8>,
    defcon_level: Option<u8>,
}

/// Pentagon Pizza Index data
#[derive(Debug, Clone)]
pub struct PizzaIndex {
    pub index: u8,           // 0-100 overall index
    pub doughcon: u8,        // 1-5 (like DEFCON)
    pub status: String,      // Human readable status
}

impl Default for PizzaIndex {
    fn default() -> Self {
        Self {
            index: 0,
            doughcon: 5,
            status: "Offline".to_string(),
        }
    }
}

/// Get status text based on DOUGHCON level
fn doughcon_status(level: u8) -> &'static str {
    match level {
        1 => "MAXIMUM READINESS",
        2 => "FAST PACE",
        3 => "INCREASED VIGILANCE",
        4 => "NORMAL READINESS",
        5 => "LOW READINESS",
        _ => "UNKNOWN",
    }
}

/// Fetch Pentagon Pizza Index from pizzint.watch
pub async fn fetch_pizza_index() -> PizzaIndex {
    match fetch_pizza_internal().await {
        Ok(data) => data,
        Err(_) => PizzaIndex::default(),
    }
}

async fn fetch_pizza_internal() -> Result<PizzaIndex> {
    let client = reqwest::Client::new();
    let response = client
        .get(PIZZINT_URL)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await?;
    
    if !response.status().is_success() {
        return Ok(PizzaIndex::default());
    }
    
    let data: PizzintResponse = response.json().await?;
    
    if !data.success {
        return Ok(PizzaIndex::default());
    }
    
    let index = data.overall_index.unwrap_or(0);
    let doughcon = data.defcon_level.unwrap_or(5);
    let status = doughcon_status(doughcon).to_string();
    
    Ok(PizzaIndex {
        index,
        doughcon,
        status,
    })
}
