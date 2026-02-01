// Stock market data from Finnhub
// Requires FINNHUB_API_KEY environment variable

use anyhow::Result;
use serde::Deserialize;
use std::env;

use crate::app::Stock;

const FINNHUB_BASE_URL: &str = "https://finnhub.io/api/v1/quote";

// ETF proxies for major indices (Finnhub free tier doesn't support direct indices)
const INDEX_ETFS: &[(&str, &str)] = &[
    ("SPY", "S&P 500"),   // SPDR S&P 500 ETF
    ("DIA", "DOW"),       // SPDR Dow Jones ETF
    ("QQQ", "NASDAQ"),    // Invesco QQQ (NASDAQ-100)
    ("GLD", "GOLD"),      // SPDR Gold Shares
];

#[derive(Debug, Deserialize)]
struct FinnhubQuote {
    c: f64,   // Current price
    d: f64,   // Change
    dp: f64,  // Percent change
    #[allow(dead_code)]
    h: f64,   // High
    #[allow(dead_code)]
    l: f64,   // Low
    #[allow(dead_code)]
    o: f64,   // Open
    pc: f64,  // Previous close
}

/// Check if Finnhub API key is configured
pub fn has_finnhub_key() -> bool {
    env::var("FINNHUB_API_KEY").map(|k| !k.is_empty()).unwrap_or(false)
}

/// Fetch stock market data from Finnhub
pub async fn fetch_stocks() -> Vec<Stock> {
    if !has_finnhub_key() {
        eprintln!("FINNHUB_API_KEY not set. Add it to .env for stock data.");
        return vec![];
    }
    
    match fetch_stocks_internal().await {
        Ok(stocks) => stocks,
        Err(e) => {
            eprintln!("Error fetching stock data: {}", e);
            vec![]
        }
    }
}

async fn fetch_stocks_internal() -> Result<Vec<Stock>> {
    let api_key = env::var("FINNHUB_API_KEY")?;
    let client = reqwest::Client::new();
    
    let mut stocks = Vec::new();
    
    for (symbol, display_name) in INDEX_ETFS {
        let url = format!("{}?symbol={}&token={}", FINNHUB_BASE_URL, symbol, api_key);
        
        let response = client
            .get(&url)
            .send()
            .await?;
        
        if !response.status().is_success() {
            continue;
        }
        
        let quote: FinnhubQuote = response.json().await?;
        
        // Skip if no data (all zeros)
        if quote.c == 0.0 && quote.pc == 0.0 {
            continue;
        }
        
        stocks.push(Stock {
            symbol: display_name.to_string(),
            price: quote.c,
            change: quote.d,
            percent: quote.dp,
        });
    }
    
    Ok(stocks)
}
