use crossterm::event::{KeyCode, KeyEvent};
use rand::Rng;
use crate::music::SpotifyManager;

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

#[derive(Debug, Default)]
pub struct App {
    pub running: bool,
    pub title: String,
    // Panel Data
    pub sports_data: Vec<String>,
    pub geo_data: Vec<String>,
    pub finance_data: Vec<String>,
    pub finance_history: Vec<u64>,
    pub prediction_data: Vec<String>,
    pub flight_data: Vec<String>,
    pub trade_data: Vec<String>,
    // Map
    pub map_events: Vec<MapEvent>,
    
    // Music
    // We wrap in Arc<Mutex> simply because we might want to spawn the update task separately
    // But for simplicity in this prototype, we'll keep it direct or use a simplified approach.
    // Actually, since SpotifyManager handles async internals, we can keep it here.
    // However, App needs to be Send for some frameworks, but here we run in one main loop.
    pub spotify: SpotifyManager,
    pub show_help: bool,
}

impl App {
    pub fn new() -> Self {
        Self {
            running: true,
            title: "GLOBAL MONITOR".to_string(),
            show_help: false,
            spotify: SpotifyManager::new(),
            sports_data: vec![
                "NBA: LAL vs BOS - 102-98 (Q4)".to_string(),
                "NFL: KC vs SF - 24-21 (Final)".to_string(),
                "UCL: RMA vs MCI - 1-1 (HT)".to_string(),
            ],
            geo_data: vec![
                "Ukraine: Conflict active in East".to_string(),
                "Taiwan: Naval exercises detected".to_string(),
                "UN: Security Council Emergency Meeting".to_string(),
            ],
            finance_data: vec![
                "S&P 500: 4,780 (+1.2%)".to_string(),
                "BTC: $65,430 (+0.5%)".to_string(),
                "GOLD: $2,045 (+0.1%)".to_string(),
            ],
            finance_history: vec![4700, 4710, 4720, 4715, 4730, 4750, 4740, 4760, 4780],
            prediction_data: vec![
                "Poly: Trump 2024 (45¢)".to_string(),
                "Kalshi: Fed Rate Cut (60%)".to_string(),
                "Poly: BTC > 100k 2024 (12¢)".to_string(),
            ],
            flight_data: vec![
                "AF1: In Transit (Atlantic)".to_string(),
                "UA920: Delayed (LHR->SFO)".to_string(),
            ],
            trade_data: vec![
                "Ever Given: Suez Canal (Clear)".to_string(),
                "Baltic Dry Index: 1,500 (+20)".to_string(),
            ],
            map_events: vec![
                MapEvent { lat: 50.45, lon: 30.52, category: EventCategory::Geopolitics, description: "Kyiv".into() },
                MapEvent { lat: 25.03, lon: 121.56, category: EventCategory::Geopolitics, description: "Taipei".into() },
                MapEvent { lat: 40.71, lon: -74.00, category: EventCategory::News, description: "NY SE".into() },
                MapEvent { lat: 34.05, lon: -118.24, category: EventCategory::Sports, description: "LA Arena".into() },
                MapEvent { lat: 51.50, lon: -0.12, category: EventCategory::Flight, description: "LHR".into() },
                MapEvent { lat: 1.35, lon: 103.81, category: EventCategory::Trade, description: "Singapore Port".into() },
            ],
        }
    }

    pub async fn tick(&mut self) {
        let mut rng = rand::rng();
        
        // Update Spotify Status
        self.spotify.update_status().await;
        
        // Randomly update finance
        if rng.random_bool(0.1) {
            let change: f64 = rng.random_range(-2.0..2.0);
            let sign = if change >= 0.0 { "+" } else { "" };
            let current_val = 4780.0 + rng.random_range(-10.0..10.0);
            self.finance_data[0] = format!("S&P 500: {:.0} ({}{:.1}%)", current_val, sign, change);
            
            self.finance_history.push(current_val as u64);
            if self.finance_history.len() > 40 {
                self.finance_history.remove(0);
            }
        }
        
        // Randomly update Prediction Markets
        if rng.random_bool(0.05) {
            let val = rng.random_range(40..60);
            self.prediction_data[0] = format!("Poly: Trump 2024 ({}¢)", val);
        }

        // Randomly blink a map event
        if rng.random_bool(0.05) {
             if let Some(event) = self.map_events.get_mut(0) {
                 event.lat += rng.random_range(-0.1..0.1);
                 event.lon += rng.random_range(-0.1..0.1);
             }
        }
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
            KeyCode::Char('?') => self.show_help = !self.show_help,
            _ => {}
        }
    }
}
