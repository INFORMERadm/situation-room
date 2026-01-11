use crossterm::event::{KeyCode, KeyEvent};
use rand::Rng;

#[derive(Debug, Default)]
pub struct App {
    pub running: bool,
    pub title: String,
    pub active_tab: usize,
    // Add states for different panels
    pub sports_data: Vec<String>,
    pub geo_data: Vec<String>,
    pub finance_data: Vec<String>,
    pub finance_history: Vec<u64>, // For sparkline
    pub map_events: Vec<(f64, f64, String)>, // Lat, Lon, Description
}

impl App {
    pub fn new() -> Self {
        Self {
            running: true,
            title: "SITUATION ROOM".to_string(),
            active_tab: 0,
            sports_data: vec![
                "NBA: LAL vs BOS - 102-98 (Q4)".to_string(),
                "NFL: KC vs SF - 24-21 (Final)".to_string(),
            ],
            geo_data: vec![
                "Ukraine: Conflict active in East".to_string(),
                "Taiwan: Naval exercises detected".to_string(),
            ],
            finance_data: vec![
                "S&P 500: 4,780 (+1.2%)".to_string(),
                "BTC: $65,430 (+0.5%)".to_string(),
            ],
            finance_history: vec![4700, 4710, 4720, 4715, 4730, 4750, 4740, 4760, 4780],
            map_events: vec![
                (50.45, 30.52, "Kyiv".to_string()),
                (25.03, 121.56, "Taipei".to_string()),
                (40.71, -74.00, "NY Stock Exchange".to_string()),
            ],
        }
    }

    pub fn tick(&mut self) {
        let mut rng = rand::rng();
        
        // Randomly update finance
        if rng.random_bool(0.1) {
            let change: f64 = rng.random_range(-2.0..2.0);
            let sign = if change >= 0.0 { "+" } else { "" };
            let current_val = 4780.0 + rng.random_range(-10.0..10.0);
            self.finance_data[0] = format!("S&P 500: {:.0} ({}{:.1}%)", current_val, sign, change);
            
            self.finance_history.push(current_val as u64);
            if self.finance_history.len() > 20 {
                self.finance_history.remove(0);
            }
        }

        // Randomly blink a map event (simulate movement or status change)
        if rng.random_bool(0.05) {
             if let Some(event) = self.map_events.get_mut(0) {
                 event.0 += rng.random_range(-0.1..0.1);
                 event.1 += rng.random_range(-0.1..0.1);
             }
        }
    }

    pub fn quit(&mut self) {
        self.running = false;
    }

    pub fn on_key(&mut self, key: KeyEvent) {
        match key.code {
            KeyCode::Char('q') | KeyCode::Esc => self.quit(),
            _ => {}
        }
    }
}
