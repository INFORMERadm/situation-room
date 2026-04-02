# N4 - Global Intelligence Platform

**Version 1.3.0**

N4 is an AI-driven information platform and global monitor built for professionals who need a centralized, intelligent dashboard combining financial markets, geopolitical monitoring, aviation tracking, OSINT, and real-time communications — all powered by AI-driven analysis and alerting.

---

## Workspaces

### Markets

- Real-time stock, forex, crypto, and commodity quotes
- Interactive price charts with multiple timeframes (1m to 1mo) and chart types (area, candlestick)
- Technical analysis indicators
- Custom watchlists with default coverage of major indices, currencies, and equities
- Ticker strip with live market overview
- Market movers — top gainers, losers, and most active
- Company profiles with fundamentals
- Sector performance breakdown
- Earnings calendar with EPS and revenue estimates
- Economic calendar with impact ratings

### News Deck

- Multi-source news aggregation across Telegram, RSS, and YouTube feeds
- Three-column feed layout with per-source refresh
- Telegram alarm notifications for breaking posts
- Market news panel with configurable alerts

### War Map (Flights & OSINT)

- Live global flight tracking via FlightRadar24 and OpenSky Network
- Flight search by aircraft type, callsign, arrivals, and departures
- Aircraft detail panels with altitude, speed, heading, origin/destination
- Historical flight track visualization

**Military & OSINT Overlays:**

- Military bases — 150+ facilities across air, naval, missile defense, radar, and command centers with operator color-coding and equipment inventories
- Naval assets — aircraft carriers, destroyers, cruisers, frigates, submarines, and amphibious ships with heading indicators and hull details
- Critical infrastructure — airports, ports, pipelines, refineries, nuclear sites, undersea cables, government installations, and more with status tracking (intact, damaged, destroyed)
- Strike detection — real-time ballistic missile and strike event monitoring with source-to-target visualization, ETA countdowns, weapon profiles, impact animations, and audible alarms

### Additional Workspaces

PA and Law workspaces are planned for future releases.

---

## AI Assistant

- Dual model support (Hypermind 6.5, GLM-5)
- Web search integration with two modes: Tavily (quick) and Advanced (Serper + Firecrawl + Jina)
- Source attribution with domain info and relevance scoring
- Document attachment with automatic PDF text extraction
- Persistent chat sessions with save, rename, and history
- Streaming responses with stop and regeneration controls
- Tool calling for chart navigation, indicator toggling, watchlist management, alert creation, and workspace switching

### Voice Mode

- Real-time voice conversation with speech-to-text and text-to-speech
- Context-aware responses using recent chat history
- MCP server integration for extended tool capabilities

---

## Messaging

- Direct messages and group chats with other platform users
- File sharing and transfer
- Link preview cards
- Read receipts and desktop notifications
- Optional AI participants in group conversations

---

## Live TV

10 live news channels available in-platform:

Bloomberg, Sky News, DW, CNBC, France24 (English and French), Al Arabiya, Al Jazeera, GB-TV, Fox News

---

## Alerts

- **AI alerts** — natural language descriptions ("Alert me when...")
- **Keyword alerts** — monitor specific terms across news feeds
- **Price alerts** — stock price triggers above or below target values
- Enable, disable, and delete alerts with last-triggered tracking

---

## MCP Integrations

Extensible tool integrations via Model Context Protocol and Smithery:

Google (Gmail, Calendar, Drive, Sheets, Docs), Microsoft (Excel, Outlook), Notion, Slack, GitHub, Exa Search, Context7, Paper Search, Weather, Polymarket, AgentMail, and custom MCP servers via URL.

OAuth and API key authentication with connection status tracking.

---

## Platform Features

- World clocks with 30+ timezone presets (default: New York, London, Tokyo)
- Dark theme interface
- Responsive grid-based layout
- Supabase authentication with protected routes and onboarding flow
- End-to-end message encryption with key management
- Browser and desktop notifications
- Audible alarms for news, strikes, and messages

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Mapping | Leaflet, React-Leaflet |
| Routing | React Router v7 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Backend | Supabase Edge Functions (Deno) |
| AI | OpenAI API |

---

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- A Supabase project (database is pre-provisioned)

### Configuration

Copy `.env.example` to `.env` and populate your keys:

```bash
cp .env.example .env
```

Required environment variables:

| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key |

Edge function secrets (configured via Supabase dashboard):

| Secret | Purpose |
|--------|---------|
| `OPENAI_API_KEY` | AI chat and voice features |
| `FR24_API_TOKEN` | FlightRadar24 flight tracking |
| `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` | OpenSky Network data |
| `MYSHIPTRACKING_API_KEY` / `MYSHIPTRACKING_SECRET_KEY` | Maritime vessel tracking |
| `AGENTMAIL_API_KEY` | AgentMail MCP integration |

### Install & Build

```bash
npm install
npm run build
```

### Development

```bash
npm run dev
```

---

## Edge Functions

The platform uses Supabase Edge Functions for backend operations:

| Function | Purpose |
|----------|---------|
| `chat-operations` | AI chat with tool calling and web search |
| `realtime-conversation` | Voice mode WebSocket relay |
| `realtime-tool-call` | Voice mode tool execution |
| `flight-radar` | Flight tracking proxy |
| `maritime-tracker` | Vessel tracking proxy |
| `strike-detector` | Strike event detection |
| `global-monitor` | Global monitoring data aggregation |
| `rss-proxy` | RSS feed fetching |
| `link-preview` | URL metadata extraction |
| `extract-document` | PDF and document text extraction |
| `smithery-connect` | MCP server connection management |
| `smithery-token` | Smithery OAuth token handling |

---

## Project Structure

```
src/
  components/
    chat/          Messaging UI (direct, group, voice rooms)
    flights/       War map, overlays, flight panels
    markets/       Charts, AI chat, live TV, market panels
    news/          News deck and feed management
  context/         Auth, platform, and watchlist state
  hooks/           Data fetching and feature logic
  lib/             API clients, utilities, encryption
  pages/           Login, register, onboarding, dashboard
  types/           TypeScript type definitions
supabase/
  functions/       Edge function source code
  migrations/      Database migration history
```

---

## License

Private. All rights reserved.
