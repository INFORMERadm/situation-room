// Cryptocurrency prices from CoinGecko
// Free tier, no API key required

use anyhow::Result;
use serde::Deserialize;
use std::collections::HashMap;

use crate::app::Stock;

const COINGECKO_URL: &str = "https://api.coingecko.com/api/v3/simple/price";

// Coins to track
const COINS: &[(&str, &str)] = &[
    ("bitcoin", "BTC"),
    ("ethereum", "ETH"),
    ("solana", "SOL"),
];

#[derive(Debug, Deserialize)]
struct CoinPrice {
    usd: f64,
    usd_24h_change: Option<f64>,
}

/// Fetch crypto prices from CoinGecko
pub async fn fetch_crypto() -> Vec<Stock> {
    match fetch_crypto_internal().await {
        Ok(stocks) => stocks,
        Err(e) => {
            eprintln!("Error fetching crypto data: {}", e);
            vec![]
        }
    }
}

async fn fetch_crypto_internal() -> Result<Vec<Stock>> {
    let ids: Vec<&str> = COINS.iter().map(|(id, _)| *id).collect();
    let ids_param = ids.join(",");
    
    let url = format!(
        "{}?ids={}&vs_currencies=usd&include_24hr_change=true",
        COINGECKO_URL, ids_param
    );
    
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await?;
    
    if !response.status().is_success() {
        return Ok(vec![]);
    }
    
    let data: HashMap<String, CoinPrice> = response.json().await?;
    
    let stocks: Vec<Stock> = COINS
        .iter()
        .filter_map(|(id, symbol)| {
            let price_data = data.get(*id)?;
            let change_pct = price_data.usd_24h_change.unwrap_or(0.0);
            let change = price_data.usd * (change_pct / 100.0);
            
            Some(Stock {
                symbol: symbol.to_string(),
                price: price_data.usd,
                change,
                percent: change_pct,
            })
        })
        .collect();
    
    Ok(stocks)
}
