mod app;
mod event;
mod tui;
mod ui;
mod api;
mod music;
mod data;

use anyhow::Result;
use app::App;
use event::{Event, EventHandler};
use std::time::Duration;
use tui::Tui;

#[tokio::main]
async fn main() -> Result<()> {
    // Load env vars
    dotenv::dotenv().ok();

    let mut terminal = tui::init()?;
    let app_result = run_app(&mut terminal).await;
    tui::restore()?;
    app_result
}

async fn run_app(terminal: &mut Tui) -> Result<()> {
    let mut app = App::new();
    
    // Attempt Spotify Init (will prompt if env vars exist)
    let _ = app.spotify.init().await;

    let tick_rate = Duration::from_millis(250);
    let mut events = EventHandler::new(tick_rate);

    while app.running {
        terminal.draw(|f| ui::render(&mut app, f))?;

        if let Some(event) = events.next().await {
            match event {
                Event::Tick => app.tick().await,
                Event::Key(key) => app.on_key(key).await,
                Event::Resize(_, _) => {}, 
                _ => {}
            }
        }
    }

    Ok(())
}
