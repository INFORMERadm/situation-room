# Sitch Cast

A breathtaking, one-of-a-kind situation room TUI for tracking sports, geopolitics, markets, and more.

## Features
- **Live World Map**: Real-time visualization of global events.
- **Military Dashboard**: A "Classified" aesthetic with dark/green theme.
- **Tactical Audio**: Integrated Spotify player with playback status and controls.
- **Real-time Panels**:
  - **Sports**: Live scores.
  - **Prediction Markets**: Real-time odds (Polymarket/Kalshi).
  - **Flights & Trade**: Tracking data.
  - **Financial**: Market tickers with live sparkline trends.

## Installation

### Prerequisites
- Rust (latest stable)
- Spotify Developer Account (for Audio features)

### Configuration
Create a `.env` file in the root directory:
```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
```

### Build & Run
```bash
cargo run
```

## Controls
- `q` or `Esc`: Quit the application.
- `Space`: Play/Pause Spotify.
- `n`: Next track.
- `p`: Previous track.
