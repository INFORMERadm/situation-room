use crossterm::event::{KeyCode, KeyEvent};
use crate::music::SpotifyManager;
use crate::data;
use std::time::Instant;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum EventCategory {
    Geopolitics,
    News,
    Sports,
    Flight,
    Trade,
}

#[derive(Debug, Clone)]
pub struct MapEvent {
    pub lat: f64,
    pub lon: f64,
    pub category: EventCategory,
    pub description: String,
}

// Card Data Structures
#[derive(Debug, Clone)]
pub struct SportsGame {
    pub league: String,
    pub match_up: String,
    pub score: String,
    pub status: String,
}

#[derive(Debug, Clone)]
pub struct Prediction {
    pub platform: String,
    pub question: String,
    pub odds: String,
}

#[derive(Debug, Clone)]
pub struct Flight {
    pub callsign: String,
    pub route: String,
    pub status: String,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
}

#[derive(Debug, Clone)]
pub struct Stock {
    pub symbol: String,
    pub price: f64,
    pub change: f64,
    pub percent: f64,
}

#[derive(Debug, Clone)]
pub struct NewsItem {
    pub source: String,
    pub headline: String,
}

#[derive(Debug, Clone)]
pub struct TradeItem {
    pub entity: String,
    pub location: String,
    pub status: String,
    pub lat: Option<f64>,
    pub lon: Option<f64>,
}

// Refresh intervals in seconds
const SPORTS_REFRESH_SECS: u64 = 30;
const NEWS_REFRESH_SECS: u64 = 60;
const FINANCE_REFRESH_SECS: u64 = 15;
const FLIGHTS_REFRESH_SECS: u64 = 30;
const PIZZA_REFRESH_SECS: u64 = 60;

#[derive(Debug)]
pub struct App {
    pub running: bool,
    pub title: String,
    // Panel Data
    pub sports_data: Vec<SportsGame>,
    pub geo_data: Vec<NewsItem>,
    pub finance_data: Vec<Stock>,
    pub finance_history: Vec<u64>,
    pub prediction_data: Vec<Prediction>,
    pub flight_data: Vec<Flight>,
    pub trade_data: Vec<TradeItem>,
    // Map
    pub map_events: Vec<MapEvent>,
    // Status indicators
    pub pizza_index: data::PizzaIndex,
    pub official_comms: Vec<String>,
    pub spotify: SpotifyManager,
    pub show_help: bool,
    // Data refresh tracking
    last_sports_update: Option<Instant>,
    last_news_update: Option<Instant>,
    last_finance_update: Option<Instant>,
    last_flights_update: Option<Instant>,
    last_pizza_update: Option<Instant>,
    initial_load_done: bool,
}

impl Default for App {
    fn default() -> Self {
        Self::new()
    }
}

impl App {
    pub fn new() -> Self {
        Self {
            running: true,
            title: "GLOBAL MONITOR".to_string(),
            show_help: false,
            spotify: SpotifyManager::new(),
            sports_data: vec![],
            geo_data: vec![],
            finance_data: vec![],
            finance_history: vec![],
            prediction_data: Self::curated_predictions(),
            flight_data: vec![],
            trade_data: Self::curated_trade_data(),
            pizza_index: data::PizzaIndex::default(),
            official_comms: vec!["Initializing data feeds...".to_string()],
            map_events: vec![],
            last_sports_update: None,
            last_news_update: None,
            last_finance_update: None,
            last_flights_update: None,
            last_pizza_update: None,
            initial_load_done: false,
        }
    }

    /// Curated prediction market data (no free API available)
    fn curated_predictions() -> Vec<Prediction> {
        vec![
            Prediction { platform: "Poly".into(), question: "Fed Rate Cut Q1".into(), odds: "42%".into() },
            Prediction { platform: "Kalshi".into(), question: "BTC > 100k".into(), odds: "35%".into() },
            Prediction { platform: "Poly".into(), question: "AI Regulation".into(), odds: "28%".into() },
        ]
    }

    /// Curated trade/shipping data (no free API available)
    fn curated_trade_data() -> Vec<TradeItem> {
        vec![
            TradeItem { 
                entity: "Suez Canal".into(), 
                location: "Egypt".into(), 
                status: "Open".into(),
                lat: Some(30.58), 
                lon: Some(32.27),
            },
            TradeItem { 
                entity: "Panama Canal".into(), 
                location: "Panama".into(), 
                status: "Operating".into(),
                lat: Some(9.08), 
                lon: Some(-79.68),
            },
            TradeItem { 
                entity: "Singapore".into(), 
                location: "Port".into(), 
                status: "Active".into(),
                lat: Some(1.26), 
                lon: Some(103.84),
            },
        ]
    }

    fn should_refresh(last_update: &Option<Instant>, interval_secs: u64) -> bool {
        match last_update {
            None => true,
            Some(t) => t.elapsed().as_secs() >= interval_secs,
        }
    }

    pub async fn tick(&mut self) {
        // Update Spotify status
        self.spotify.update_status().await;

        // Initial load - fetch all data
        if !self.initial_load_done {
            self.fetch_all_data().await;
            self.initial_load_done = true;
            self.official_comms.insert(0, "Data feeds connected".to_string());
            if self.official_comms.len() > 5 {
                self.official_comms.pop();
            }
            return;
        }

        // Periodic refreshes
        if Self::should_refresh(&self.last_sports_update, SPORTS_REFRESH_SECS) {
            self.sports_data = data::fetch_all_sports().await;
            self.last_sports_update = Some(Instant::now());
        }

        if Self::should_refresh(&self.last_news_update, NEWS_REFRESH_SECS) {
            self.geo_data = data::fetch_news().await;
            self.last_news_update = Some(Instant::now());
        }

        if Self::should_refresh(&self.last_finance_update, FINANCE_REFRESH_SECS) {
            // Fetch crypto (always available) and stocks (if API key set)
            let mut finance = data::fetch_crypto().await;
            let stocks = data::fetch_stocks().await;
            finance.extend(stocks);
            
            // Update history with first price
            if let Some(stock) = finance.first() {
                self.finance_history.push(stock.price as u64);
                if self.finance_history.len() > 40 {
                    self.finance_history.remove(0);
                }
            }
            
            self.finance_data = finance;
            self.last_finance_update = Some(Instant::now());
        }

        if Self::should_refresh(&self.last_flights_update, FLIGHTS_REFRESH_SECS) {
            self.flight_data = data::fetch_flights().await;
            self.last_flights_update = Some(Instant::now());
        }

        if Self::should_refresh(&self.last_pizza_update, PIZZA_REFRESH_SECS) {
            self.pizza_index = data::fetch_pizza_index().await;
            self.last_pizza_update = Some(Instant::now());
        }
    }

    async fn fetch_all_data(&mut self) {
        // Fetch all data sources concurrently
        let (sports, news, crypto, stocks, flights, pizza) = tokio::join!(
            data::fetch_all_sports(),
            data::fetch_news(),
            data::fetch_crypto(),
            data::fetch_stocks(),
            data::fetch_flights(),
            data::fetch_pizza_index(),
        );

        self.sports_data = sports;
        self.geo_data = news;
        
        // Combine crypto and stock data
        let mut finance = crypto;
        finance.extend(stocks);
        self.finance_data = finance;
        
        self.flight_data = flights;
        self.pizza_index = pizza;

        // Update timestamps
        let now = Instant::now();
        self.last_sports_update = Some(now);
        self.last_news_update = Some(now);
        self.last_finance_update = Some(now);
        self.last_flights_update = Some(now);
        self.last_pizza_update = Some(now);
    }

    pub fn quit(&mut self) {
        self.running = false;
    }

    pub async fn on_key(&mut self, key: KeyEvent) {
        match key.code {
            KeyCode::Char('q') | KeyCode::Esc => self.quit(),
            KeyCode::Char(' ') => self.spotify.toggle_play().await,
            KeyCode::Char('n') => self.spotify.next_track().await,
            KeyCode::Char('p') => self.spotify.previous_track().await,
            KeyCode::Char('r') => {
                // Manual refresh
                self.initial_load_done = false;
                self.official_comms.insert(0, "Refreshing data...".to_string());
            }
            KeyCode::Char('?') => self.show_help = !self.show_help,
            _ => {}
        }
    }
}
