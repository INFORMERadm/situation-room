// Sports data from ESPN hidden API
// No API key required

use anyhow::Result;
use serde::Deserialize;

use crate::app::SportsGame;

const ESPN_BASE_URL: &str = "https://site.api.espn.com/apis/site/v2/sports";

#[derive(Debug, Deserialize)]
struct EspnResponse {
    events: Option<Vec<EspnEvent>>,
}

#[derive(Debug, Deserialize)]
struct EspnEvent {
    name: String,
    status: EspnStatus,
    competitions: Vec<EspnCompetition>,
}

#[derive(Debug, Deserialize)]
struct EspnStatus {
    #[serde(rename = "type")]
    status_type: EspnStatusType,
}

#[derive(Debug, Deserialize)]
struct EspnStatusType {
    #[serde(rename = "shortDetail")]
    short_detail: Option<String>,
    description: Option<String>,
}

#[derive(Debug, Deserialize)]
struct EspnCompetition {
    competitors: Vec<EspnCompetitor>,
}

#[derive(Debug, Deserialize)]
struct EspnCompetitor {
    team: EspnTeam,
    score: Option<String>,
}

#[derive(Debug, Deserialize)]
struct EspnTeam {
    abbreviation: String,
}

/// Fetch sports scores from ESPN for a specific league
async fn fetch_league_scores(sport: &str, league: &str, league_display: &str) -> Result<Vec<SportsGame>> {
    let url = format!("{}/{}/{}/scoreboard", ESPN_BASE_URL, sport, league);
    
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await?;
    
    if !response.status().is_success() {
        return Ok(vec![]);
    }
    
    let data: EspnResponse = response.json().await?;
    
    let games = data.events.unwrap_or_default()
        .into_iter()
        .filter_map(|event| {
            let competition = event.competitions.first()?;
            let competitors = &competition.competitors;
            
            if competitors.len() < 2 {
                return None;
            }
            
            let home = &competitors[0];
            let away = &competitors[1];
            
            let match_up = format!("{} vs {}", 
                away.team.abbreviation, 
                home.team.abbreviation
            );
            
            let score = format!("{}-{}", 
                away.score.as_deref().unwrap_or("0"),
                home.score.as_deref().unwrap_or("0")
            );
            
            let status = event.status.status_type.short_detail
                .or(event.status.status_type.description)
                .unwrap_or_else(|| "Scheduled".to_string());
            
            Some(SportsGame {
                league: league_display.to_string(),
                match_up,
                score,
                status,
            })
        })
        .collect();
    
    Ok(games)
}

/// Fetch all sports scores from multiple leagues
pub async fn fetch_all_sports() -> Vec<SportsGame> {
    let leagues = [
        ("basketball", "nba", "NBA"),
        ("football", "nfl", "NFL"),
        ("hockey", "nhl", "NHL"),
        ("soccer", "eng.1", "EPL"),
        ("racing", "f1", "F1"),
    ];
    
    let mut all_games = Vec::new();
    
    // Fetch from each league and take up to 2 games per league for variety
    for (sport, league, display) in leagues {
        match fetch_league_scores(sport, league, display).await {
            Ok(mut games) => {
                // Take at most 2 games per league to ensure variety
                games.truncate(2);
                all_games.extend(games);
            }
            Err(_) => {
                // Silently skip failed leagues (errors go to stderr)
            }
        }
    }
    
    // Limit total to 8 games
    all_games.truncate(8);
    all_games
}
