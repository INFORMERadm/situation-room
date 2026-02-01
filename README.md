# Sitch Cast

![Screenshot](Screenshot%202026-01-31%20at%209.32.07%E2%80%AFPM.png)

A breathtaking, one-of-a-kind situation room TUI for tracking sports, geopolitics, markets, and more.

## Features
- **Live World Map**: Real-time visualization of global events.
- **Military Dashboard**: A "Classified" aesthetic with dark/green theme.
- **Tactical Audio**: Integrated Spotify player with playback status and controls.
- **Real-time Panels**:
  - **Sports**: Live scores from ESPN.
  - **Prediction Markets**: Curated odds (Polymarket/Kalshi).
  - **Flights**: Live tracking via OpenSky Network.
  - **Financial**: Crypto (CoinGecko) + stocks (Finnhub).
  - **News/Intel**: GDELT geopolitics feed.

## Installation

### Prerequisites
- Rust (latest stable)

### Configuration
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

## API Keys

### Required for Full Functionality

| Service | Purpose | Free Tier | Get Key |
|---------|---------|-----------|---------|
| **Finnhub** | Stock market data | 60 calls/min | [finnhub.io](https://finnhub.io/) |
| **Spotify** | Music controls | N/A | [developer.spotify.com](https://developer.spotify.com/dashboard) |

### No API Key Required

These data sources work immediately without configuration:

| Service | Data |
|---------|------|
| **ESPN** | Live sports scores (NBA, NFL, NHL, EPL, F1) |
| **OpenSky** | Flight tracking (ADS-B data) |
| **CoinGecko** | Cryptocurrency prices |
| **GDELT** | Geopolitics & intel news |

### Getting API Keys

#### Finnhub (Stock Data)
1. Go to [finnhub.io](https://finnhub.io/)
2. Click "Get Free API Key"
3. Sign up with email
4. Copy your API key from the dashboard
5. Add to `.env`: `FINNHUB_API_KEY=your_key_here`

#### Spotify (Optional - Music Controls)
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new application
3. Add `http://localhost:8888/callback` to Redirect URIs
4. Copy Client ID and Client Secret to `.env`

## Build & Run
```bash
cargo run
```

## Controls
- `q` or `Esc`: Quit the application.
- `Space`: Play/Pause Spotify.
- `n`: Next track.
- `p`: Previous track.
- `r`: Refresh all data.
- `?`: Toggle help.

## Data Refresh Rates
- Sports: every 30 seconds
- Finance: every 15 seconds  
- Flights: every 30 seconds
- News: every 60 seconds
