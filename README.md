# Sitch Cast

A breathtaking, one-of-a-kind situation room TUI for tracking sports, geopolitics, markets, and more.

## Features
- **Live World Map**: Real-time visualization of global events with categorized markers:
  - 📍 Geopolitics (Red)
  - 📰 News (Yellow)
  - 🏀 Sports (Magenta)
  - ✈ Flights (Cyan)
  - 🚢 Trade (Blue)
- **Military Dashboard**: A "Classified" aesthetic with dark/green theme.
- **Real-time Panels**:
  - **Sports**: Live scores.
  - **Prediction Markets**: Real-time odds (Polymarket/Kalshi).
  - **Flights & Trade**: Tracking data.
  - **Financial**: Market tickers with live sparkline trends.
- **Built with Rust**: High performance using `ratatui` and `tokio`.

## Installation

### Prerequisites
- Rust (latest stable)

### Build & Run
```bash
cargo run
```

## Architecture
- **src/main.rs**: Entry point and event loop.
- **src/ui.rs**: Layout and rendering logic (Map, Panels).
- **src/app.rs**: Application state and simulation logic.
- **src/api.rs**: Framework for integrating external APIs (Alpha Vantage, NewsAPI, Polymarket).

## Controls
- `q` or `Esc`: Quit the application.

## Roadmap
- [ ] Connect `src/api.rs` clients to real endpoints.
- [ ] Add configuration file for API keys.
- [ ] Enhance map resolution and interactivity.
