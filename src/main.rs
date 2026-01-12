mod app;
mod event;
mod tui;
mod ui;
mod api;
mod music;

use anyhow::Result;
use app::App;
use event::{Event, EventHandler};
use std::time::Duration;
use tui::Tui;
use clap::Parser;

#[derive(Parser, Debug)]
#[command(version, about, long_about = None)]
struct Args {
    /// Enable demo mode with simulated data
    #[arg(short, long)]
    demo: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Load env vars
    dotenv::dotenv().ok();
    
    // Parse args
    let args = Args::parse();

    let mut terminal = tui::init()?;
    let app_result = run_app(&mut terminal, args.demo).await;
    tui::restore()?;
    app_result
}

async fn run_app(terminal: &mut Tui, demo_mode: bool) -> Result<()> {
    let mut app = App::new(demo_mode);
    
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
