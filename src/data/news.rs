// News and geopolitics from GDELT API
// Free, no authentication required

use anyhow::Result;
use serde::Deserialize;

use crate::app::NewsItem;

const GDELT_URL: &str = "https://api.gdeltproject.org/api/v2/doc/doc";

#[derive(Debug, Deserialize)]
struct GdeltResponse {
    articles: Option<Vec<GdeltArticle>>,
}

#[derive(Debug, Deserialize)]
struct GdeltArticle {
    title: String,
    domain: Option<String>,
    #[allow(dead_code)]
    url: Option<String>,
}

/// Fetch geopolitics/intel news from GDELT
pub async fn fetch_news() -> Vec<NewsItem> {
    match fetch_news_internal().await {
        Ok(news) => news,
        Err(e) => {
            eprintln!("Error fetching news: {}", e);
            vec![]
        }
    }
}

async fn fetch_news_internal() -> Result<Vec<NewsItem>> {
    let query = "(geopolitics OR military OR \"national security\" OR intelligence) sourcelang:english";
    let url = format!(
        "{}?query={}&timespan=24h&mode=artlist&maxrecords=10&format=json&sort=date",
        GDELT_URL,
        urlencoding::encode(query)
    );
    
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await?;
    
    if !response.status().is_success() {
        return Ok(vec![]);
    }
    
    // Check content type
    let content_type = response.headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    
    if !content_type.contains("application/json") {
        return Ok(vec![]);
    }
    
    let text = response.text().await?;
    let data: GdeltResponse = serde_json::from_str(&text)?;
    
    let news: Vec<NewsItem> = data.articles
        .unwrap_or_default()
        .into_iter()
        .take(5)
        .map(|article| {
            // Extract domain name or use default
            let source = article.domain
                .map(|d| {
                    // Clean up domain (remove www. and .com/.org)
                    d.trim_start_matches("www.")
                        .split('.')
                        .next()
                        .unwrap_or(&d)
                        .to_string()
                })
                .unwrap_or_else(|| "News".to_string());
            
            // Truncate long headlines
            let headline = if article.title.len() > 80 {
                format!("{}...", &article.title[..77])
            } else {
                article.title
            };
            
            NewsItem { source, headline }
        })
        .collect();
    
    Ok(news)
}
