// Data pipeline module for fetching live data from various sources
//
// This module provides async functions to fetch real-time data from:
// - ESPN (sports scores, no API key)
// - OpenSky (flight tracking, no API key)
// - CoinGecko (crypto prices, no API key)
// - GDELT (news/geopolitics, no API key)
// - Finnhub (stock market, requires API key)
// - PizzINT (Pentagon Pizza Index, no API key)

pub mod sports;
pub mod flights;
pub mod crypto;
pub mod news;
pub mod finance;
pub mod pizza;

pub use sports::*;
pub use flights::*;
pub use crypto::*;
pub use news::*;
pub use finance::*;
pub use pizza::*;
