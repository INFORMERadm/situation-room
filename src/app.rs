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
}

#[derive(Debug, Default)]
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
    // ... rest of fields
    pub pizza_meter: u8,
    pub official_comms: Vec<String>,
    pub spotify: SpotifyManager,
    pub show_help: bool,
    pub demo_mode: bool,
}

impl App {
    pub fn new(demo_mode: bool) -> Self {
        let mut app = Self {
            running: true,
            title: "GLOBAL MONITOR".to_string(),
            show_help: false,
            demo_mode,
            spotify: SpotifyManager::new(),
            sports_data: vec![],
            geo_data: vec![],
            finance_data: vec![],
            finance_history: vec![],
            prediction_data: vec![],
            flight_data: vec![],
            trade_data: vec![],
            pizza_meter: 0,
            official_comms: vec![],
            map_events: vec![],
        };

        if demo_mode {
            app.init_demo_data();
        } else {
            app.init_empty_state();
        }

        app
    }

    fn init_empty_state(&mut self) {
        // We'll leave empty vecs for card view to show nothing or a "No Data" card
    }

    fn init_demo_data(&mut self) {
        self.title = "GLOBAL MONITOR (DEMO)".to_string();
        
        self.sports_data = vec![
            SportsGame { league: "NBA".into(), match_up: "LAL vs BOS".into(), score: "102-98".into(), status: "Q4 2:30".into() },
            SportsGame { league: "NFL".into(), match_up: "KC vs SF".into(), score: "24-21".into(), status: "FINAL".into() },
            SportsGame { league: "UCL".into(), match_up: "RMA vs MCI".into(), score: "1-1".into(), status: "HT".into() },
            SportsGame { league: "F1".into(), match_up: "Monaco GP".into(), score: "VER P1".into(), status: "Lap 45/78".into() },
        ];
        
        self.geo_data = vec![
            NewsItem { source: "Reuters".into(), headline: "Conflict escalates in Eastern region".into() },
            NewsItem { source: "AP".into(), headline: "Naval exercises detected in Pacific".into() },
            NewsItem { source: "UN".into(), headline: "Security Council emergency meeting called".into() },
        ];
        
        self.finance_data = vec![
            Stock { symbol: "S&P 500".into(), price: 4780.0, change: 57.4, percent: 1.2 },
            Stock { symbol: "BTC".into(), price: 65430.0, change: 320.0, percent: 0.5 },
            Stock { symbol: "GOLD".into(), price: 2045.0, change: 2.1, percent: 0.1 },
            Stock { symbol: "NVDA".into(), price: 890.5, change: -12.3, percent: -1.4 },
        ];
        
        self.finance_history = vec![4700, 4710, 4720, 4715, 4730, 4750, 4740, 4760, 4780];
        
        self.prediction_data = vec![
            Prediction { platform: "Poly".into(), question: "Trump 2024".into(), odds: "45¢".into() },
            Prediction { platform: "Kalshi".into(), question: "Fed Rate Cut".into(), odds: "60%".into() },
            Prediction { platform: "Poly".into(), question: "BTC > 100k".into(), odds: "12¢".into() },
        ];
        
        self.flight_data = vec![
            Flight { callsign: "AF1".into(), route: "ADW -> LHR".into(), status: "In Transit".into() },
            Flight { callsign: "UA920".into(), route: "LHR -> SFO".into(), status: "Delayed".into() },
            Flight { callsign: "G-5".into(), route: "GVA -> DXB".into(), status: "Landed".into() },
        ];
        
        self.trade_data = vec![
            TradeItem { entity: "Ever Given".into(), location: "Suez Canal".into(), status: "Clear".into() },
            TradeItem { entity: "Baltic Dry".into(), location: "Global".into(), status: "1,500 (+20)".into() },
            TradeItem { entity: "Maersk".into(), location: "Red Sea".into(), status: "Rerouted".into() },
        ];

        self.pizza_meter = 15;
        self.official_comms = vec![
            "@POTUS: Monitoring situation in region.".to_string(),
            "@Elysee: Strong commitment to stability.".to_string(),
        ];
        self.map_events = vec![
            MapEvent { lat: 50.45, lon: 30.52, category: EventCategory::Geopolitics, description: "Kyiv".into() },
            MapEvent { lat: 25.03, lon: 121.56, category: EventCategory::Geopolitics, description: "Taipei".into() },
            MapEvent { lat: 40.71, lon: -74.00, category: EventCategory::News, description: "NY SE".into() },
            MapEvent { lat: 34.05, lon: -118.24, category: EventCategory::Sports, description: "LA Arena".into() },
            MapEvent { lat: 51.50, lon: -0.12, category: EventCategory::Flight, description: "LHR".into() },
            MapEvent { lat: 1.35, lon: 103.81, category: EventCategory::Trade, description: "Singapore Port".into() },
        ];
    }

    pub async fn tick(&mut self) {
        let mut rng = rand::rng();
        
        self.spotify.update_status().await;

        if self.demo_mode {
            // Update Finance
            if rng.random_bool(0.1) {
                if let Some(stock) = self.finance_data.first_mut() {
                    let change_amt = rng.random_range(-2.0..2.0);
                    stock.price += change_amt;
                    stock.change += change_amt;
                    stock.percent = (stock.change / (stock.price - stock.change)) * 100.0;
                    
                    self.finance_history.push(stock.price as u64);
                    if self.finance_history.len() > 40 {
                        self.finance_history.remove(0);
                    }
                }
            }
            
            // Update Predictions
            if rng.random_bool(0.05) {
                if let Some(pred) = self.prediction_data.first_mut() {
                     let val = rng.random_range(40..60);
                     pred.odds = format!("{}¢", val);
                }
            }

            // Blink Map
            if rng.random_bool(0.05) {
                 if let Some(event) = self.map_events.get_mut(0) {
                     event.lat += rng.random_range(-0.1..0.1);
                     event.lon += rng.random_range(-0.1..0.1);
                 }
            }
            
            // Pizza Meter
            if rng.random_bool(0.02) {
                let fluctuation = rng.random_range(-5..10);
                self.pizza_meter = (self.pizza_meter as i32 + fluctuation).clamp(0, 100) as u8;
            }

            // Tweets
            if rng.random_bool(0.01) {
                let leaders = ["@POTUS", "@Pontifex", "@NATO", "@UN", "@ZelenskyyUa", "@KremlinRussia_E"];
                let msgs = ["Updates expected soon.", "Briefing underway.", "Call concluded.", "Statement issued."];
                let leader = leaders[rng.random_range(0..leaders.len())];
                let msg = msgs[rng.random_range(0..msgs.len())];
                
                self.official_comms.insert(0, format!("{}: {}", leader, msg));
                if self.official_comms.len() > 10 {
                    self.official_comms.pop();
                }
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
