use std::io;
use crossterm::{
    event::{DisableMouseCapture, EnableMouseCapture},
    execute,
    terminal::{EnterAlternateScreen, LeaveAlternateScreen, enable_raw_mode, disable_raw_mode},
};
use ratatui::prelude::*;

pub type Tui = Terminal<CrosstermBackend<io::Stdout>>;

pub fn init() -> io::Result<Tui> {
    execute!(io::stdout(), EnterAlternateScreen, EnableMouseCapture)?;
    enable_raw_mode()?;
    Terminal::new(CrosstermBackend::new(io::stdout()))
}

pub fn restore() -> io::Result<()> {
    execute!(io::stdout(), LeaveAlternateScreen, DisableMouseCapture)?;
    disable_raw_mode()?;
    Ok(())
}
