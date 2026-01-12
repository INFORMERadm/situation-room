use anyhow::Result;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct StockQuote {
    pub symbol: String,
    pub price: f64,
    pub change_percent: f64,
}

#[derive(Debug, Deserialize)]
pub struct NewsArticle {
    pub title: String,
    pub source: String,
    pub url: String,
}

pub trait DataSource {
    fn name(&self) -> &str;
    // In a real app, these would return Futures
}

pub struct AlphaVantageClient {
    api_key: String,
}

impl AlphaVantageClient {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
    
    // Future implementation:
    // pub async fn get_quote(&self, symbol: &str) -> Result<StockQuote> { ... }
}

pub struct NewsApiClient {
    api_key: String,
}

impl NewsApiClient {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
}

pub struct PolymarketClient;

impl PolymarketClient {
    pub fn new() -> Self {
        Self
    }
}
